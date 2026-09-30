import { SessionSummary } from '../exercises/types';
import { ProgressionState } from '../game/types';
import {
  WalletState,
  TransactionRecord,
  AvatarCustomization,
  AvatarProgression,
  DEFAULT_AVATAR_CUSTOMIZATION,
  DEFAULT_AVATAR_PROGRESSION,
  DEFAULT_WALLET_STATE,
} from '../avatar/types';

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

export interface AvatarState {
  customization: AvatarCustomization;
  progression: AvatarProgression;
}

export const DEFAULT_AVATAR_STATE: AvatarState = {
  customization: { ...DEFAULT_AVATAR_CUSTOMIZATION },
  progression: { ...DEFAULT_AVATAR_PROGRESSION },
};

export interface StorageAdapter {
  getProfile(): Promise<UserProfile>;
  saveProfile(profile: UserProfile): Promise<void>;
  getProgression(): Promise<ProgressionState>;
  saveProgression(state: ProgressionState): Promise<void>;
  getSessions(filter?: { movement?: string }): Promise<SessionSummary[]>;
  saveSession(session: SessionSummary): Promise<void>;
  deleteSession(id: string): Promise<void>;
  getWallet(): Promise<WalletState>;
  saveWallet(wallet: WalletState): Promise<void>;
  getAvatar(): Promise<AvatarState>;
  saveAvatar(avatar: AvatarState): Promise<void>;
  getTransactions(): Promise<TransactionRecord[]>;
  saveTransactions(transactions: TransactionRecord[]): Promise<void>;
  exportData(): Promise<{
    profile: UserProfile;
    progression: ProgressionState;
    sessions: SessionSummary[];
    wallet: WalletState;
    avatar: AvatarState;
    transactions: TransactionRecord[];
  }>;
  clearAllData(): Promise<void>;
}
