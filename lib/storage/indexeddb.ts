import { SessionSummary } from '../exercises/types';
import { ProgressionState } from '../game/types';
import { INITIAL_PROGRESSION_STATE } from '../game/progression';
import { StorageAdapter, UserProfile, DEFAULT_USER_PROFILE } from './types';

const DB_NAME = 'kinetra_local_db';
const DB_VERSION = 1;

class MemoryStorageAdapter implements StorageAdapter {
  private profile: UserProfile = { ...DEFAULT_USER_PROFILE };
  private progression: ProgressionState = { ...INITIAL_PROGRESSION_STATE };
  private sessions: SessionSummary[] = [];

  async getProfile(): Promise<UserProfile> {
    return { ...this.profile };
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    this.profile = { ...profile, updatedAt: new Date().toISOString() };
  }

  async getProgression(): Promise<ProgressionState> {
    return JSON.parse(JSON.stringify(this.progression));
  }

  async saveProgression(state: ProgressionState): Promise<void> {
    this.progression = JSON.parse(JSON.stringify(state));
  }

  async getSessions(filter?: { movement?: string }): Promise<SessionSummary[]> {
    if (filter?.movement) {
      return this.sessions.filter((s) => s.movement === filter.movement);
    }
    return [...this.sessions].reverse();
  }

  async saveSession(session: SessionSummary): Promise<void> {
    const existingIdx = this.sessions.findIndex((s) => s.id === session.id);
    if (existingIdx >= 0) {
      this.sessions[existingIdx] = session;
    } else {
      this.sessions.push(session);
    }
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions = this.sessions.filter((s) => s.id !== id);
  }

  async exportData(): Promise<{ profile: UserProfile; progression: ProgressionState; sessions: SessionSummary[] }> {
    return {
      profile: await this.getProfile(),
      progression: await this.getProgression(),
      sessions: await this.getSessions(),
    };
  }

  async clearAllData(): Promise<void> {
    this.profile = { ...DEFAULT_USER_PROFILE };
    this.progression = { ...INITIAL_PROGRESSION_STATE };
    this.sessions = [];
  }
}

export class IndexedDBStorageAdapter implements StorageAdapter {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memoryFallback: MemoryStorageAdapter | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      throw new Error('IndexedDB not supported in current environment');
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e) => {
          const db = req.result;
          if (!db.objectStoreNames.contains('profile')) {
            db.createObjectStore('profile', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('progression')) {
            db.createObjectStore('progression', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('sessions')) {
            const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
            sessionStore.createIndex('movement', 'movement', { unique: false });
            sessionStore.createIndex('startedAt', 'startedAt', { unique: false });
          }
        };

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }

    return this.dbPromise;
  }

  private async safeExecute<T>(fn: (db: IDBDatabase) => Promise<T>, fallbackFn: (mem: MemoryStorageAdapter) => Promise<T>): Promise<T> {
    try {
      const db = await this.getDB();
      return await fn(db);
    } catch (err) {
      console.warn('IndexedDB unavailable or encountered an error; falling back to memory adapter:', err);
      if (!this.memoryFallback) {
        this.memoryFallback = new MemoryStorageAdapter();
      }
      return await fallbackFn(this.memoryFallback);
    }
  }

  async getProfile(): Promise<UserProfile> {
    return this.safeExecute(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction('profile', 'readonly');
          const store = tx.objectStore('profile');
          const req = store.get('current_user');
          req.onsuccess = () => resolve(req.result?.data || DEFAULT_USER_PROFILE);
          req.onerror = () => reject(req.error);
        }),
      (mem) => mem.getProfile()
    );
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    return this.safeExecute(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction('profile', 'readwrite');
          const store = tx.objectStore('profile');
          const req = store.put({ key: 'current_user', data: { ...profile, updatedAt: new Date().toISOString() } });
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      (mem) => mem.saveProfile(profile)
    );
  }

  async getProgression(): Promise<ProgressionState> {
    return this.safeExecute(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction('progression', 'readonly');
          const store = tx.objectStore('progression');
          const req = store.get('main_progression');
          req.onsuccess = () => resolve(req.result?.data || INITIAL_PROGRESSION_STATE);
          req.onerror = () => reject(req.error);
        }),
      (mem) => mem.getProgression()
    );
  }

  async saveProgression(state: ProgressionState): Promise<void> {
    return this.safeExecute(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction('progression', 'readwrite');
          const store = tx.objectStore('progression');
          const req = store.put({ key: 'main_progression', data: state });
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      (mem) => mem.saveProgression(state)
    );
  }

  async getSessions(filter?: { movement?: string }): Promise<SessionSummary[]> {
    return this.safeExecute(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction('sessions', 'readonly');
          const store = tx.objectStore('sessions');
          const req = store.getAll();
          req.onsuccess = () => {
            const list: SessionSummary[] = req.result || [];
            let filtered = list;
            if (filter?.movement) {
              filtered = list.filter((s) => s.movement === filter.movement);
            }
            // Sort by startedAt descending
            filtered.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
            resolve(filtered);
          };
          req.onerror = () => reject(req.error);
        }),
      (mem) => mem.getSessions(filter)
    );
  }

  async saveSession(session: SessionSummary): Promise<void> {
    return this.safeExecute(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction('sessions', 'readwrite');
          const store = tx.objectStore('sessions');
          const req = store.put(session);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      (mem) => mem.saveSession(session)
    );
  }

  async deleteSession(id: string): Promise<void> {
    return this.safeExecute(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction('sessions', 'readwrite');
          const store = tx.objectStore('sessions');
          const req = store.delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      (mem) => mem.deleteSession(id)
    );
  }

  async exportData(): Promise<{ profile: UserProfile; progression: ProgressionState; sessions: SessionSummary[] }> {
    const profile = await this.getProfile();
    const progression = await this.getProgression();
    const sessions = await this.getSessions();
    return { profile, progression, sessions };
  }

  async clearAllData(): Promise<void> {
    return this.safeExecute(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(['profile', 'progression', 'sessions'], 'readwrite');
          tx.objectStore('profile').clear();
          tx.objectStore('progression').clear();
          tx.objectStore('sessions').clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        }),
      (mem) => mem.clearAllData()
    );
  }
}

/**
 * Isolated Demo Storage Adapter.
 * Replays, synthetic tests, and demos use this adapter so that NO fake data
 * can ever bleed into the user's real IndexedDB or ledger.
 */
export class DemoStorageAdapter extends MemoryStorageAdapter {}

// Singleton default export for application usage
export const defaultStorage = new IndexedDBStorageAdapter();
export const demoStorage = new DemoStorageAdapter();
