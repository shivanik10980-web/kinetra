import { SessionSummary } from '../exercises/types';
import { ProgressionState } from '../game/types';

export interface UserProfile {
  id: string;
  displayName: string;
  locale: 'en' | 'hi';
  theme: 'light' | 'dark' | 'system';
  preferredMode: 'camera' | 'guided';
  reducedMotion: boolean;
  soundEnabled: boolean;
  captionsEnabled: boolean;
  cloudSyncEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: 'guest_local',
  displayName: 'Practitioner',
  locale: 'en',
  theme: 'system',
  preferredMode: 'camera',
  reducedMotion: false,
  soundEnabled: false,
  captionsEnabled: true,
  cloudSyncEnabled: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export interface StorageAdapter {
  getProfile(): Promise<UserProfile>;
  saveProfile(profile: UserProfile): Promise<void>;
  getProgression(): Promise<ProgressionState>;
  saveProgression(state: ProgressionState): Promise<void>;
  getSessions(filter?: { movement?: string }): Promise<SessionSummary[]>;
  saveSession(session: SessionSummary): Promise<void>;
  deleteSession(id: string): Promise<void>;
  exportData(): Promise<{ profile: UserProfile; progression: ProgressionState; sessions: SessionSummary[] }>;
  clearAllData(): Promise<void>;
}
