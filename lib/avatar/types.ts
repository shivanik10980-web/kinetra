import { MuscleRegionId } from './config';

export type MuscleAllocation = Record<MuscleRegionId, number>;

export type LineageId = 'human' | 'werewolf' | 'tigerhuman';

export type FacePresetId = 'sharp' | 'round' | 'stoic' | 'fierce';

export type HairstyleId = 'wild' | 'short' | 'ponytail' | 'buzz' | 'flowing';

export type OutfitId = 'gi' | 'training_tunic' | 'ronin_vest' | 'compression_armor';

export interface AvatarCustomization {
  characterName: string;
  facePreset: FacePresetId;
  skinTone: string; // hex
  hairColor: string; // hex
  eyeColor: string; // hex
  clothingColor: string; // hex
  hairstyle: HairstyleId;
  outfit: OutfitId;
  heightScale: number; // 0.9 to 1.1
  shoulderWidthScale: number; // 0.9 to 1.1
}

export interface AvatarProgression {
  lineage: LineageId;
  evolutionStage: 'human' | 'awakened';
  hasAwakened: boolean;
  awakenedAt: string | null;
  muscleAllocation: MuscleAllocation;
  developmentUnitsTotal: number;
  unlockedMutationTiers: number[];
}

export interface WalletState {
  growthPoints: number; // Spendable balance
  lifetimeXp: number; // Permanent, never spent
  lifetimeGpEarned: number;
  totalGpSpent: number;
  migrationMarker: string | null; // e.g. 'gp_migration_v1'
  lastRewardedDate: string | null;
}

export interface TransactionRecord {
  id: string;
  timestamp: string;
  type: 'earn_reward' | 'spend_muscle' | 'balanced_upgrade' | 'migration';
  amount: number; // positive = credit, negative = debit
  balanceAfter: number;
  referenceId: string;
  description: string;
}

export const DEFAULT_AVATAR_CUSTOMIZATION: AvatarCustomization = {
  characterName: 'Kinetra Pioneer',
  facePreset: 'stoic',
  skinTone: '#E0AC69',
  hairColor: '#1A1817',
  eyeColor: '#2563EB',
  clothingColor: '#0EA5E9',
  hairstyle: 'wild',
  outfit: 'gi',
  heightScale: 1.0,
  shoulderWidthScale: 1.0,
};

export const DEFAULT_MUSCLE_ALLOCATION: MuscleAllocation = {
  chest: 0,
  back: 0,
  arms: 0,
  shoulders: 0,
  core: 0,
  legs: 0,
};

export const DEFAULT_AVATAR_PROGRESSION: AvatarProgression = {
  lineage: 'human',
  evolutionStage: 'human',
  hasAwakened: false,
  awakenedAt: null,
  muscleAllocation: { ...DEFAULT_MUSCLE_ALLOCATION },
  developmentUnitsTotal: 0,
  unlockedMutationTiers: [],
};

export const DEFAULT_WALLET_STATE: WalletState = {
  growthPoints: 0,
  lifetimeXp: 0,
  lifetimeGpEarned: 0,
  totalGpSpent: 0,
  migrationMarker: null,
  lastRewardedDate: null,
};
