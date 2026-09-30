import {
  GAME_ECONOMY,
  MUSCLE_REGIONS,
  WEREWOLF_LINEAGE,
  TIGERHUMAN_LINEAGE,
  MuscleRegionId,
} from '../avatar/config';
import {
  WalletState,
  TransactionRecord,
  AvatarProgression,
  AvatarCustomization,
  MuscleAllocation,
  DEFAULT_WALLET_STATE,
  DEFAULT_AVATAR_PROGRESSION,
} from '../avatar/types';
import { ProgressionState } from './types';

/**
 * Migration: Convert historical earned XP into GP once.
 * Inspects ProgressionState.totalXp and initialises the wallet.
 */
export function migrateHistoricalXpToGp(
  progression: ProgressionState,
  existingWallet?: WalletState | null
): { wallet: WalletState; transactions: TransactionRecord[]; migrated: boolean } {
  // If already migrated, return existing wallet safely
  if (existingWallet && existingWallet.migrationMarker === GAME_ECONOMY.MIGRATION_MARKER_V1) {
    return { wallet: existingWallet, transactions: [], migrated: false };
  }

  const historicalLifetimeXp = Math.max(0, progression.totalXp || 0);
  const startingGp = historicalLifetimeXp * GAME_ECONOMY.GP_PER_XP;

  const initialWallet: WalletState = {
    growthPoints: startingGp,
    lifetimeXp: historicalLifetimeXp,
    lifetimeGpEarned: startingGp,
    totalGpSpent: 0,
    migrationMarker: GAME_ECONOMY.MIGRATION_MARKER_V1,
    lastRewardedDate: null,
  };

  const migrationTx: TransactionRecord = {
    id: `tx_migration_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'migration',
    amount: startingGp,
    balanceAfter: startingGp,
    referenceId: 'legacy_xp_conversion_v1',
    description: `Migrated ${historicalLifetimeXp} lifetime XP into ${startingGp} initial Growth Points (GP).`,
  };

  return {
    wallet: initialWallet,
    transactions: [migrationTx],
    migrated: true,
  };
}

/**
 * Credits Growth Points atomically when an XP reward event occurs.
 * Prevents duplicate rewards by checking the transaction ledger.
 */
export function creditRewardGrowthPoints(
  wallet: WalletState,
  ledger: TransactionRecord[],
  rewardEventId: string,
  xpAwarded: number,
  description: string
): { success: boolean; newWallet: WalletState; newLedger: TransactionRecord[]; error?: string } {
  if (xpAwarded <= 0) {
    return { success: true, newWallet: wallet, newLedger: ledger };
  }

  // Idempotency check: duplicate reward IDs are rejected
  const alreadyProcessed = ledger.some(
    (tx) => tx.referenceId === rewardEventId || tx.id === `tx_${rewardEventId}`
  );
  if (alreadyProcessed) {
    return {
      success: false,
      newWallet: wallet,
      newLedger: ledger,
      error: `Reward event ${rewardEventId} has already been credited to Growth Points.`,
    };
  }

  const gpToAdd = xpAwarded * GAME_ECONOMY.GP_PER_XP;
  const newBalance = wallet.growthPoints + gpToAdd;
  const newLifetimeXp = wallet.lifetimeXp + xpAwarded;
  const newLifetimeGp = wallet.lifetimeGpEarned + gpToAdd;

  const newTx: TransactionRecord = {
    id: `tx_${rewardEventId}`,
    timestamp: new Date().toISOString(),
    type: 'earn_reward',
    amount: gpToAdd,
    balanceAfter: newBalance,
    referenceId: rewardEventId,
    description,
  };

  const newWallet: WalletState = {
    ...wallet,
    growthPoints: newBalance,
    lifetimeXp: newLifetimeXp,
    lifetimeGpEarned: newLifetimeGp,
  };

  return {
    success: true,
    newWallet,
    newLedger: [newTx, ...ledger],
  };
}

/**
 * Calculates the GP cost to upgrade a muscle region from currentLevel to targetLevel.
 */
export function calculateRegionCost(
  currentLevel: number,
  targetLevel: number,
  _isAwakened = false
): number {
  if (targetLevel <= currentLevel) return 0;
  const levelDiff = targetLevel - currentLevel;
  return levelDiff * GAME_ECONOMY.MUSCLE_COST_PER_LEVEL_HUMAN;
}

/**
 * Calculates balanced allocation cost across all 6 regions to reach a minimum uniform level.
 */
export function calculateBalancedAllocation(
  current: MuscleAllocation,
  targetUniformLevel: number
): { totalCost: number; newAllocation: MuscleAllocation } {
  let totalCost = 0;
  const newAllocation: MuscleAllocation = { ...current };

  for (const region of MUSCLE_REGIONS) {
    const curLevel = current[region.id] || 0;
    if (curLevel < targetUniformLevel) {
      const diff = targetUniformLevel - curLevel;
      totalCost += diff * GAME_ECONOMY.MUSCLE_COST_PER_LEVEL_HUMAN;
      newAllocation[region.id] = targetUniformLevel;
    }
  }

  return { totalCost, newAllocation };
}

/**
 * Checks if the avatar meets the first evolution threshold (all 6 regions at level >= 4).
 */
export function checkEvolutionEligibility(allocation: MuscleAllocation): {
  eligible: boolean;
  currentLevels: Record<MuscleRegionId, number>;
  requiredLevel: number;
  totalGpInvestedInThreshold: number;
  missingRegions: MuscleRegionId[];
} {
  const missingRegions: MuscleRegionId[] = [];
  let totalLevelsTowardsThreshold = 0;

  for (const r of MUSCLE_REGIONS) {
    const lvl = allocation[r.id] || 0;
    totalLevelsTowardsThreshold += Math.min(lvl, GAME_ECONOMY.EVOLUTION_REQUIRED_REGION_LEVEL);
    if (lvl < GAME_ECONOMY.EVOLUTION_REQUIRED_REGION_LEVEL) {
      missingRegions.push(r.id);
    }
  }

  return {
    eligible: missingRegions.length === 0,
    currentLevels: { ...allocation },
    requiredLevel: GAME_ECONOMY.EVOLUTION_REQUIRED_REGION_LEVEL,
    totalGpInvestedInThreshold:
      totalLevelsTowardsThreshold * GAME_ECONOMY.MUSCLE_COST_PER_LEVEL_HUMAN,
    missingRegions,
  };
}

/**
 * Spends Growth Points atomically for muscle development.
 * Prevents negative balances, double clicks, and duplicate purchases.
 */
export function spendGrowthPointsForMuscles(
  wallet: WalletState,
  avatar: AvatarProgression,
  ledger: TransactionRecord[],
  purchaseId: string,
  newAllocation: MuscleAllocation,
  description: string
): {
  success: boolean;
  newWallet: WalletState;
  newAvatar: AvatarProgression;
  newLedger: TransactionRecord[];
  error?: string;
} {
  // Duplicate purchase check
  if (ledger.some((tx) => tx.id === `tx_spend_${purchaseId}`)) {
    return {
      success: false,
      newWallet: wallet,
      newAvatar: avatar,
      newLedger: ledger,
      error: 'Duplicate transaction detected.',
    };
  }

  // Calculate exact total cost
  let totalCost = 0;
  let addedLevels = 0;
  for (const r of MUSCLE_REGIONS) {
    const prev = avatar.muscleAllocation[r.id] || 0;
    const next = newAllocation[r.id] || 0;
    if (next < prev) {
      return {
        success: false,
        newWallet: wallet,
        newAvatar: avatar,
        newLedger: ledger,
        error: `Cannot decrease muscle level for region ${r.id}. Growth is strictly progressive.`,
      };
    }
    if (next > GAME_ECONOMY.MAX_MUSCLE_LEVEL) {
      return {
        success: false,
        newWallet: wallet,
        newAvatar: avatar,
        newLedger: ledger,
        error: `Max muscle level is ${GAME_ECONOMY.MAX_MUSCLE_LEVEL}.`,
      };
    }
    const diff = next - prev;
    totalCost += diff * GAME_ECONOMY.MUSCLE_COST_PER_LEVEL_HUMAN;
    addedLevels += diff;
  }

  if (totalCost === 0) {
    return {
      success: false,
      newWallet: wallet,
      newAvatar: avatar,
      newLedger: ledger,
      error: 'No muscle development levels selected.',
    };
  }

  // Check sufficient balance
  if (wallet.growthPoints < totalCost) {
    return {
      success: false,
      newWallet: wallet,
      newAvatar: avatar,
      newLedger: ledger,
      error: `Insufficient Growth Points. Need ${totalCost} GP, but wallet has ${wallet.growthPoints} GP.`,
    };
  }

  const multiplier =
    avatar.evolutionStage === 'awakened'
      ? GAME_ECONOMY.POST_AWAKENING_MULTIPLIER
      : GAME_ECONOMY.DEVELOPMENT_UNITS_PER_HUMAN_LEVEL;

  const addedUnits = addedLevels * multiplier;
  const newUnitsTotal = avatar.developmentUnitsTotal + addedUnits;

  // Calculate unlocked mutations for awakened lineages
  const newUnlockedTiers: number[] = [...avatar.unlockedMutationTiers];
  if (avatar.evolutionStage === 'awakened' && avatar.lineage !== 'human') {
    const milestones =
      avatar.lineage === 'werewolf'
        ? WEREWOLF_LINEAGE.milestones
        : TIGERHUMAN_LINEAGE.milestones;

    for (const m of milestones) {
      if (newUnitsTotal >= m.developmentUnitsRequired && !newUnlockedTiers.includes(m.tier)) {
        newUnlockedTiers.push(m.tier);
      }
    }
    newUnlockedTiers.sort((a, b) => a - b);
  }

  const balanceAfter = wallet.growthPoints - totalCost;
  const newWallet: WalletState = {
    ...wallet,
    growthPoints: balanceAfter,
    totalGpSpent: wallet.totalGpSpent + totalCost,
  };

  const newAvatar: AvatarProgression = {
    ...avatar,
    muscleAllocation: { ...newAllocation },
    developmentUnitsTotal: newUnitsTotal,
    unlockedMutationTiers: newUnlockedTiers,
  };

  const newTx: TransactionRecord = {
    id: `tx_spend_${purchaseId}`,
    timestamp: new Date().toISOString(),
    type: 'spend_muscle',
    amount: -totalCost,
    balanceAfter,
    referenceId: purchaseId,
    description: `${description} (-${totalCost} GP, +${addedUnits.toFixed(1)} dev units)`,
  };

  return {
    success: true,
    newWallet,
    newAvatar,
    newLedger: [newTx, ...ledger],
  };
}

/**
 * Lineage Awakening Ceremony (Evolution).
 * Rules:
 * - Requires eligibility (all 6 regions level >= 4).
 * - Only one awakening per character.
 * - Preserves: identity, customization, cosmetics, achievements, lifetime XP, and unspent GP.
 * - Resets: muscle development to a slender base (all regions 0).
 * - Applies: permanent lineage ('werewolf' | 'tigerhuman') and 1.5x muscle growth multiplier.
 */
export function awakenLineage(
  avatar: AvatarProgression,
  chosenLineage: 'werewolf' | 'tigerhuman'
): { success: boolean; newAvatar: AvatarProgression; error?: string } {
  if (avatar.hasAwakened) {
    return {
      success: false,
      newAvatar: avatar,
      error: 'Character has already awakened a primal lineage. Evolution is permanent for this release.',
    };
  }

  const eligibility = checkEvolutionEligibility(avatar.muscleAllocation);
  if (!eligibility.eligible) {
    return {
      success: false,
      newAvatar: avatar,
      error: `All six muscle regions must reach level 4 to evolve. Missing: ${eligibility.missingRegions.join(', ')}.`,
    };
  }

  const resetAllocation: MuscleAllocation = {
    chest: 0,
    back: 0,
    arms: 0,
    shoulders: 0,
    core: 0,
    legs: 0,
  };

  const newAvatar: AvatarProgression = {
    ...avatar,
    lineage: chosenLineage,
    evolutionStage: 'awakened',
    hasAwakened: true,
    awakenedAt: new Date().toISOString(),
    muscleAllocation: resetAllocation,
    // Development units reset to 0 for post-awakening progression
    developmentUnitsTotal: 0,
    unlockedMutationTiers: [],
  };

  return {
    success: true,
    newAvatar,
  };
}
