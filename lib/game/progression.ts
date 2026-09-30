import { MovementSource } from '../exercises/types';
import { GAME_ECONOMY } from '../avatar/config';
import {
  BadgeId,
  DailyLedger,
  ProgressionState,
  RANKS,
  RankTitle,
  StaticGateBoss,
  RewardEventType,
} from './types';

export const INITIAL_PROGRESSION_STATE: ProgressionState = {
  totalXp: 0,
  level: 1,
  rank: 'Initiate',
  nextRankMinXp: 120,
  xpToNextRank: 120,
  dailyLedgers: {},
  unlockedBadges: [],
  boss: {
    currentStage: 'learn',
    stageProgress: {
      learn: false,
      practise_adapt: false,
      reflect_recover: false,
    },
    clearedAt: null,
  },
  skillBranches: {
    movementPractice: 1,
    mobilityPractice: 1,
    balanceAwareness: 1,
    recoveryLiteracy: 1,
  },
};

/**
 * Level = 1 + floor(totalXP / 100)
 */
export function calculateLevel(totalXp: number): number {
  return 1 + Math.floor(Math.max(0, totalXp) / 100);
}

/**
 * Rank calculation according to spec:
 * Initiate 0, Explorer 120, Navigator 360, Pathfinder 720, Guide 1200
 */
export function calculateRank(totalXp: number): {
  rank: RankTitle;
  nextRankMinXp: number | null;
  xpToNextRank: number | null;
} {
  const safeXp = Math.max(0, totalXp);
  let currentRank: RankTitle = 'Initiate';
  let nextRankMinXp: number | null = 120;

  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (safeXp >= RANKS[i].minXp) {
      currentRank = RANKS[i].title;
      nextRankMinXp = i < RANKS.length - 1 ? RANKS[i + 1].minXp : null;
      break;
    }
  }

  const xpToNextRank = nextRankMinXp !== null ? Math.max(0, nextRankMinXp - safeXp) : null;

  return {
    rank: currentRank,
    nextRankMinXp,
    xpToNextRank,
  };
}

/**
 * Daily XP formula with centralized configurable ruleset:
 * - Daily participation: 30 XP
 * - Reflection: 10 XP
 * - Planned practice: 10 XP
 * - Learning/mastery bonus: 5 XP
 * - Optional booster contribution: max 5 XP
 * - Shared daily maximum: 60 XP
 */
export function calculateDailyCap(
  slotFlag: boolean,
  reflectionFlag: boolean,
  plannedPracticeFlag = false,
  masteryBonusFlag = false,
  boosterContribution = 0
): number {
  const calculated =
    (slotFlag ? GAME_ECONOMY.DAILY_PARTICIPATION_REWARD : 0) +
    (reflectionFlag ? GAME_ECONOMY.REFLECTION_REWARD : 0) +
    (plannedPracticeFlag ? GAME_ECONOMY.PLANNED_PRACTICE_BONUS : 0) +
    (masteryBonusFlag ? GAME_ECONOMY.MASTERY_BONUS : 0) +
    Math.min(GAME_ECONOMY.BOOSTER_CONTRIBUTION_MAX, Math.max(0, boosterContribution));
  return Math.min(GAME_ECONOMY.MAX_DAILY_XP, calculated);
}

/**
 * Applies a reward event to progression state with idempotency & strict 60 daily cap.
 * Supports continued logging even after currency cap has been reached.
 */
export function applyReward(
  currentState: ProgressionState,
  event: {
    eventId: string;
    type: RewardEventType;
    source: MovementSource;
    dateKey: string; // YYYY-MM-DD
    details?: {
      movement?: string;
      hadPause?: boolean;
      boosterAmount?: number;
    };
  }
): {
  newState: ProgressionState;
  awardedXp: number;
  isDuplicate: boolean;
  newBadges: BadgeId[];
  isDemoBlocked: boolean;
} {
  // STRICT DEMO ISOLATION: Replay / Demo events cannot mutate real progression
  if (event.source === 'demo') {
    return {
      newState: currentState,
      awardedXp: 0,
      isDuplicate: false,
      newBadges: [],
      isDemoBlocked: true,
    };
  }

  const existingLedger: DailyLedger = currentState.dailyLedgers[event.dateKey] || {
    dateKey: event.dateKey,
    slotFlag: false,
    reflectionFlag: false,
    plannedPracticeFlag: false,
    masteryBonusFlag: false,
    boosterContribution: 0,
    xpEarned: 0,
    gpEarned: 0,
    eventIds: [],
  };

  // Idempotency: check if eventId was already processed
  if (existingLedger.eventIds.includes(event.eventId)) {
    return {
      newState: currentState,
      awardedXp: 0,
      isDuplicate: true,
      newBadges: [],
      isDemoBlocked: false,
    };
  }

  // Calculate new flags
  const newSlotFlag = event.type === 'slot' ? true : existingLedger.slotFlag;
  const newReflectionFlag = event.type === 'reflection' ? true : existingLedger.reflectionFlag;
  const newPlannedFlag =
    event.type === 'planned_practice' ? true : !!existingLedger.plannedPracticeFlag;
  const newMasteryFlag =
    event.type === 'mastery' ? true : !!existingLedger.masteryBonusFlag;
  const newBoosterContrib =
    event.type === 'booster'
      ? Math.min(
          GAME_ECONOMY.BOOSTER_CONTRIBUTION_MAX,
          (existingLedger.boosterContribution || 0) + (event.details?.boosterAmount || 5)
        )
      : (existingLedger.boosterContribution || 0);

  const targetDailyXp = calculateDailyCap(
    newSlotFlag,
    newReflectionFlag,
    newPlannedFlag,
    newMasteryFlag,
    newBoosterContrib
  );
  
  // Award only what remains under the shared cap
  const awardedXp = Math.max(0, targetDailyXp - existingLedger.xpEarned);

  const updatedLedger: DailyLedger = {
    ...existingLedger,
    slotFlag: newSlotFlag,
    reflectionFlag: newReflectionFlag,
    plannedPracticeFlag: newPlannedFlag,
    masteryBonusFlag: newMasteryFlag,
    boosterContribution: newBoosterContrib,
    xpEarned: existingLedger.xpEarned + awardedXp,
    gpEarned: (existingLedger.gpEarned || existingLedger.xpEarned) + awardedXp,
    eventIds: [...existingLedger.eventIds, event.eventId],
  };

  const newTotalXp = currentState.totalXp + awardedXp;
  const newLevel = calculateLevel(newTotalXp);
  const { rank, nextRankMinXp, xpToNextRank } = calculateRank(newTotalXp);

  const updatedLedgers = {
    ...currentState.dailyLedgers,
    [event.dateKey]: updatedLedger,
  };

  // Check Badges
  const newBadges: BadgeId[] = [];
  const currentBadges = new Set(currentState.unlockedBadges);

  // 1. First Check-in
  if (!currentBadges.has('first_checkin') && (newSlotFlag || newReflectionFlag)) {
    newBadges.push('first_checkin');
    currentBadges.add('first_checkin');
  }

  // 2. Viewfinder (live camera session)
  if (!currentBadges.has('viewfinder') && event.source === 'live') {
    newBadges.push('viewfinder');
    currentBadges.add('viewfinder');
  }

  // 3. Thoughtful Pause
  if (!currentBadges.has('thoughtful_pause') && event.details?.hadPause) {
    newBadges.push('thoughtful_pause');
    currentBadges.add('thoughtful_pause');
  }

  // 4. Three Practice Days
  const distinctPracticeDays = Object.values(updatedLedgers).filter((l) => l.slotFlag).length;
  if (!currentBadges.has('three_practice_days') && distinctPracticeDays >= 3) {
    newBadges.push('three_practice_days');
    currentBadges.add('three_practice_days');
  }

  // 5. Mobility Explorer
  if (
    !currentBadges.has('mobility_explorer') &&
    (event.details?.movement === 'seated_guided' || event.details?.movement === 'recovery_checkin')
  ) {
    newBadges.push('mobility_explorer');
    currentBadges.add('mobility_explorer');
  }

  // Boss progress
  const updatedBoss: StaticGateBoss = { ...currentState.boss };
  if (event.type === 'slot') {
    updatedBoss.stageProgress.practise_adapt = true;
  }
  if (event.type === 'reflection') {
    updatedBoss.stageProgress.reflect_recover = true;
  }
  if (
    updatedBoss.stageProgress.learn &&
    updatedBoss.stageProgress.practise_adapt &&
    updatedBoss.stageProgress.reflect_recover &&
    !updatedBoss.clearedAt
  ) {
    updatedBoss.currentStage = 'cleared';
    updatedBoss.clearedAt = new Date().toISOString();
  }

  const newState: ProgressionState = {
    totalXp: newTotalXp,
    level: newLevel,
    rank,
    nextRankMinXp,
    xpToNextRank,
    dailyLedgers: updatedLedgers,
    unlockedBadges: Array.from(currentBadges),
    boss: updatedBoss,
    skillBranches: { ...currentState.skillBranches },
  };

  return {
    newState,
    awardedXp,
    isDuplicate: false,
    newBadges,
    isDemoBlocked: false,
  };
}
