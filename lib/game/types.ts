import { MovementSource } from '../exercises/types';

export type RankTitle = 'Initiate' | 'Explorer' | 'Navigator' | 'Pathfinder' | 'Guide';

export interface RankInfo {
  title: RankTitle;
  minXp: number;
  unlockedPerksKey: string;
}

export const RANKS: RankInfo[] = [
  { title: 'Initiate', minXp: 0, unlockedPerksKey: 'rank.initiate.perks' },
  { title: 'Explorer', minXp: 120, unlockedPerksKey: 'rank.explorer.perks' },
  { title: 'Navigator', minXp: 360, unlockedPerksKey: 'rank.navigator.perks' },
  { title: 'Pathfinder', minXp: 720, unlockedPerksKey: 'rank.pathfinder.perks' },
  { title: 'Guide', minXp: 1200, unlockedPerksKey: 'rank.guide.perks' },
];

export type BadgeId =
  | 'first_checkin'
  | 'viewfinder'
  | 'thoughtful_pause'
  | 'three_practice_days'
  | 'mobility_explorer';

export interface Badge {
  id: BadgeId;
  nameKey: string;
  descriptionKey: string;
  unlockedAt: string | null; // ISO date or null
}

export type BossStageId = 'learn' | 'practise_adapt' | 'reflect_recover' | 'cleared';

export interface StaticGateBoss {
  currentStage: BossStageId;
  stageProgress: {
    learn: boolean;
    practise_adapt: boolean;
    reflect_recover: boolean;
  };
  clearedAt: string | null;
}

export interface DailyLedger {
  dateKey: string; // YYYY-MM-DD
  slotFlag: boolean;               // Daily participation (30 XP/GP)
  reflectionFlag: boolean;         // Reflection (10 XP/GP)
  plannedPracticeFlag?: boolean;   // Planned practice bonus (10 XP/GP)
  masteryBonusFlag?: boolean;      // Learning/mastery bonus (5 XP/GP)
  boosterContribution?: number;    // Optional booster contribution (max 5 XP/GP)
  xpEarned: number;                // Shared daily max: 60
  gpEarned?: number;               // Shared daily max: 60
  eventIds: string[];
}

export interface ProgressionState {
  totalXp: number;
  level: number;
  rank: RankTitle;
  nextRankMinXp: number | null;
  xpToNextRank: number | null;
  dailyLedgers: Record<string, DailyLedger>; // dateKey -> DailyLedger
  unlockedBadges: BadgeId[];
  boss: StaticGateBoss;
  skillBranches: {
    movementPractice: number; // level 1-5
    mobilityPractice: number;
    balanceAwareness: number;
    recoveryLiteracy: number;
  };
}

export type RewardEventType =
  | 'slot'
  | 'reflection'
  | 'planned_practice'
  | 'mastery'
  | 'booster';

export interface RewardEvent {
  eventId: string;
  type: RewardEventType;
  source: MovementSource;
  dateKey: string;
  xpAwarded: number;
  boosterAmount?: number;
}
