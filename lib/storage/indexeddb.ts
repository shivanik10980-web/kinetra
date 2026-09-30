import { SessionSummary } from '../exercises/types';
import { ProgressionState } from '../game/types';
import { INITIAL_PROGRESSION_STATE } from '../game/progression';
import {
  StorageAdapter,
  UserProfile,
  DEFAULT_USER_PROFILE,
  AvatarState,
  DEFAULT_AVATAR_STATE,
} from './types';
import {
  WalletState,
  TransactionRecord,
  DEFAULT_WALLET_STATE,
} from '../avatar/types';
import { migrateHistoricalXpToGp } from '../game/currency';

const DB_NAME = 'kinetra_local_db';
const DB_VERSION = 1;

class MemoryStorageAdapter implements StorageAdapter {
  private profile: UserProfile = { ...DEFAULT_USER_PROFILE };
  private progression: ProgressionState = { ...INITIAL_PROGRESSION_STATE };
  private sessions: SessionSummary[] = [];
  private wallet: WalletState | null = null;
  private avatar: AvatarState = JSON.parse(JSON.stringify(DEFAULT_AVATAR_STATE));
  private transactions: TransactionRecord[] = [];

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

  async getWallet(): Promise<WalletState> {
    if (!this.wallet) {
      const { wallet, transactions } = migrateHistoricalXpToGp(this.progression, null);
      this.wallet = wallet;
      this.transactions.push(...transactions);
    }
    return JSON.parse(JSON.stringify(this.wallet));
  }

  async saveWallet(wallet: WalletState): Promise<void> {
    this.wallet = JSON.parse(JSON.stringify(wallet));
  }

  async getAvatar(): Promise<AvatarState> {
    return JSON.parse(JSON.stringify(this.avatar));
  }

  async saveAvatar(avatar: AvatarState): Promise<void> {
    this.avatar = JSON.parse(JSON.stringify(avatar));
  }

  async getTransactions(): Promise<TransactionRecord[]> {
    return JSON.parse(JSON.stringify(this.transactions));
  }

  async saveTransactions(transactions: TransactionRecord[]): Promise<void> {
    this.transactions = JSON.parse(JSON.stringify(transactions));
  }

  async exportData(): Promise<{
    profile: UserProfile;
    progression: ProgressionState;
    sessions: SessionSummary[];
    wallet: WalletState;
    avatar: AvatarState;
    transactions: TransactionRecord[];
  }> {
    return {
      profile: await this.getProfile(),
      progression: await this.getProgression(),
      sessions: await this.getSessions(),
      wallet: await this.getWallet(),
      avatar: await this.getAvatar(),
      transactions: await this.getTransactions(),
    };
  }

  async clearAllData(): Promise<void> {
    this.profile = { ...DEFAULT_USER_PROFILE };
    this.progression = { ...INITIAL_PROGRESSION_STATE };
    this.sessions = [];
    this.wallet = null;
    this.avatar = JSON.parse(JSON.stringify(DEFAULT_AVATAR_STATE));
    this.transactions = [];
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

        req.onupgradeneeded = () => {
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

  private async safeExecute<T>(
    fn: (db: IDBDatabase) => Promise<T>,
    fallbackFn: (mem: MemoryStorageAdapter) => Promise<T>
  ): Promise<T> {
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

  async getWallet(): Promise<WalletState> {
    const rawWallet = await this.safeExecute<WalletState | null>(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction('progression', 'readonly');
          const store = tx.objectStore('progression');
          const req = store.get('wallet_state');
          req.onsuccess = () => resolve(req.result?.data || null);
          req.onerror = () => reject(req.error);
        }),
      (mem) => mem.getWallet()
    );

    if (rawWallet && rawWallet.migrationMarker) {
      return rawWallet;
    }

    // Perform one-time migration from historical progression
    const prog = await this.getProgression();
    const { wallet, transactions } = migrateHistoricalXpToGp(prog, rawWallet);
    await this.saveWallet(wallet);
    if (transactions.length > 0) {
      const existingTx = await this.getTransactions();
      await this.saveTransactions([...transactions, ...existingTx]);
    }
    return wallet;
  }

  async saveWallet(wallet: WalletState): Promise<void> {
    return this.safeExecute(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction('progression', 'readwrite');
          const store = tx.objectStore('progression');
          const req = store.put({ key: 'wallet_state', data: wallet });
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      (mem) => mem.saveWallet(wallet)
    );
  }

  async getAvatar(): Promise<AvatarState> {
    return this.safeExecute(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction('progression', 'readonly');
          const store = tx.objectStore('progression');
          const req = store.get('avatar_state');
          req.onsuccess = () => resolve(req.result?.data || DEFAULT_AVATAR_STATE);
          req.onerror = () => reject(req.error);
        }),
      (mem) => mem.getAvatar()
    );
  }

  async saveAvatar(avatar: AvatarState): Promise<void> {
    return this.safeExecute(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction('progression', 'readwrite');
          const store = tx.objectStore('progression');
          const req = store.put({ key: 'avatar_state', data: avatar });
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      (mem) => mem.saveAvatar(avatar)
    );
  }

  async getTransactions(): Promise<TransactionRecord[]> {
    return this.safeExecute(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction('progression', 'readonly');
          const store = tx.objectStore('progression');
          const req = store.get('transactions_ledger');
          req.onsuccess = () => resolve(req.result?.data || []);
          req.onerror = () => reject(req.error);
        }),
      (mem) => mem.getTransactions()
    );
  }

  async saveTransactions(transactions: TransactionRecord[]): Promise<void> {
    return this.safeExecute(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction('progression', 'readwrite');
          const store = tx.objectStore('progression');
          const req = store.put({ key: 'transactions_ledger', data: transactions });
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      (mem) => mem.saveTransactions(transactions)
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

  async exportData(): Promise<{
    profile: UserProfile;
    progression: ProgressionState;
    sessions: SessionSummary[];
    wallet: WalletState;
    avatar: AvatarState;
    transactions: TransactionRecord[];
  }> {
    const profile = await this.getProfile();
    const progression = await this.getProgression();
    const sessions = await this.getSessions();
    const wallet = await this.getWallet();
    const avatar = await this.getAvatar();
    const transactions = await this.getTransactions();
    return { profile, progression, sessions, wallet, avatar, transactions };
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

export class DemoStorageAdapter extends MemoryStorageAdapter {}

export const defaultStorage = new IndexedDBStorageAdapter();
export const demoStorage = new DemoStorageAdapter();
