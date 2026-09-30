export type HumanMuscleRegionId =
  | 'neck'
  | 'upper_back'
  | 'lower_back'
  | 'forearms'
  | 'shoulders'
  | 'upper_arms'
  | 'chest'
  | 'abs_core'
  | 'thighs'
  | 'calves';

export type FantasyMuscleRegionId =
  | 'neck'
  | 'lats'
  | 'traps'
  | 'lower_back'
  | 'forearms'
  | 'front_side_shoulders'
  | 'rear_delts'
  | 'biceps'
  | 'triceps'
  | 'chest'
  | 'abs_core'
  | 'thighs'
  | 'hips_glutes'
  | 'calves'
  | 'jaw';

export type LegacyMuscleRegionId =
  | 'chest'
  | 'back'
  | 'arms'
  | 'shoulders'
  | 'core'
  | 'legs';

export type MuscleRegionId = HumanMuscleRegionId | FantasyMuscleRegionId | LegacyMuscleRegionId;

export type MuscleAllocation = Record<string, number>;

export type LineageId = 'human' | 'werewolf' | 'tigerhuman' | 'hawk' | 'bullman';

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

export interface ArchivedForm {
  lineage: LineageId;
  evolutionStage: 'human' | 'awakened';
  archivedAt: string;
  muscleAllocation: MuscleAllocation;
  developmentUnitsTotal: number;
}

export interface AvatarProgression {
  lineage: LineageId;
  evolutionStage: 'human' | 'awakened';
  hasAwakened: boolean;
  awakenedAt: string | null;
  muscleAllocation: MuscleAllocation;
  developmentUnitsTotal: number;
  unlockedMutationTiers: number[];
  archivedForms?: ArchivedForm[];
  unlockedTitles?: string[];
  selectedTitle?: string | null;
}

export interface WalletState {
  growthPoints: number; // Spendable balance
  lifetimeXp: number; // Permanent, never spent
  lifetimeGpEarned: number;
  totalGpSpent: number;
  migrationMarker: string | null; // e.g. 'gp_migration_v2_ten_groups'
  lastRewardedDate: string | null;
  inventory?: Record<string, number>; // booster itemId -> quantity
  redeemedCodes?: string[]; // Promo codes redeemed by the user
}

export interface TransactionRecord {
  id: string;
  timestamp: string;
  type: 'earn_reward' | 'spend_muscle' | 'balanced_upgrade' | 'migration' | 'booster_consumed' | 'redeem_code';
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

export const DEFAULT_HUMAN_MUSCLE_ALLOCATION: Record<HumanMuscleRegionId, number> = {
  neck: 0,
  upper_back: 0,
  lower_back: 0,
  forearms: 0,
  shoulders: 0,
  upper_arms: 0,
  chest: 0,
  abs_core: 0,
  thighs: 0,
  calves: 0,
};

export const DEFAULT_FANTASY_MUSCLE_ALLOCATION: Record<FantasyMuscleRegionId, number> = {
  neck: 0,
  lats: 0,
  traps: 0,
  lower_back: 0,
  forearms: 0,
  front_side_shoulders: 0,
  rear_delts: 0,
  biceps: 0,
  triceps: 0,
  chest: 0,
  abs_core: 0,
  thighs: 0,
  hips_glutes: 0,
  calves: 0,
  jaw: 0,
};

export const DEFAULT_MUSCLE_ALLOCATION: MuscleAllocation = {
  ...DEFAULT_HUMAN_MUSCLE_ALLOCATION,
};

export const DEFAULT_AVATAR_PROGRESSION: AvatarProgression = {
  lineage: 'human',
  evolutionStage: 'human',
  hasAwakened: false,
  awakenedAt: null,
  muscleAllocation: { ...DEFAULT_HUMAN_MUSCLE_ALLOCATION },
  developmentUnitsTotal: 0,
  unlockedMutationTiers: [],
  archivedForms: [],
  unlockedTitles: [],
  selectedTitle: null,
};

export const DEFAULT_WALLET_STATE: WalletState = {
  growthPoints: 0,
  lifetimeXp: 0,
  lifetimeGpEarned: 0,
  totalGpSpent: 0,
  migrationMarker: null,
  lastRewardedDate: null,
  inventory: {
    focus_token: 1,
    training_insight: 1,
    style_boost: 1,
  },
};
