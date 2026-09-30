import {
  GAME_ECONOMY,
  HUMAN_MUSCLE_REGIONS,
  FANTASY_MUSCLE_REGIONS,
  WEREWOLF_LINEAGE,
  TIGERHUMAN_LINEAGE,
  COMBINATION_TITLES,
  CombinationTitle,
  HumanMuscleRegionId,
  FantasyMuscleRegionId,
  MuscleRegionId,
} from '../avatar/config';
import {
  WalletState,
  TransactionRecord,
  AvatarProgression,
  MuscleAllocation,
  DEFAULT_WALLET_STATE,
  DEFAULT_HUMAN_MUSCLE_ALLOCATION,
  DEFAULT_FANTASY_MUSCLE_ALLOCATION,
  ArchivedForm,
} from '../avatar/types';
import { ProgressionState } from './types';

/**
 * Migration v1: Convert historical earned XP into GP once.
 */
export function migrateHistoricalXpToGp(
  progression: ProgressionState,
  existingWallet?: WalletState | null
): { wallet: WalletState; transactions: TransactionRecord[]; migrated: boolean } {
  if (
    existingWallet &&
    (existingWallet.migrationMarker === GAME_ECONOMY.MIGRATION_MARKER_V1 ||
      existingWallet.migrationMarker === GAME_ECONOMY.MIGRATION_MARKER_V2)
  ) {
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
    inventory: { focus_token: 1, training_insight: 1, style_boost: 1 },
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
 * Migration v2: Deterministic upgrade from legacy 6 muscle groups to 10 Human groups.
 * Conserves 100% of invested GP value. Any remainder from integer level conversion
 * is deterministically refunded to the spendable wallet balance.
 */
export function migrateToTenMuscleGroups(
  wallet: WalletState,
  avatar: AvatarProgression
): { wallet: WalletState; avatar: AvatarProgression; transactions: TransactionRecord[]; migrated: boolean } {
  if (wallet.migrationMarker === GAME_ECONOMY.MIGRATION_MARKER_V2) {
    return { wallet, avatar, transactions: [], migrated: false };
  }

  const oldAlloc = avatar.muscleAllocation || {};
  const isLegacy6 =
    'back' in oldAlloc ||
    'arms' in oldAlloc ||
    'core' in oldAlloc ||
    'legs' in oldAlloc ||
    !('abs_core' in oldAlloc);

  if (!isLegacy6 && avatar.evolutionStage === 'awakened') {
    // Already fantasy or new format
    const updatedWallet = { ...wallet, migrationMarker: GAME_ECONOMY.MIGRATION_MARKER_V2 };
    return { wallet: updatedWallet, avatar, transactions: [], migrated: true };
  }

  // Calculate legacy GP spent (old system was 10 GP per level across 6 groups)
  const oldChest = oldAlloc.chest || 0;
  const oldBack = oldAlloc.back || 0;
  const oldArms = oldAlloc.arms || 0;
  const oldShoulders = oldAlloc.shoulders || 0;
  const oldCore = oldAlloc.core || oldAlloc.abs_core || 0;
  const oldLegs = oldAlloc.legs || 0;

  const oldInvestedGp =
    (oldChest + oldBack + oldArms + oldShoulders + oldCore + oldLegs) * 10;

  // Distribute into 10 Human groups (each level = 8 GP, max 5 levels)
  const newAllocation: MuscleAllocation = { ...DEFAULT_HUMAN_MUSCLE_ALLOCATION };

  // Helper to convert GP into capped levels
  const gpToLevels = (gp: number, maxLvl = 5) => {
    const lvl = Math.min(maxLvl, Math.floor(gp / GAME_ECONOMY.HUMAN_GP_PER_LEVEL));
    const spent = lvl * GAME_ECONOMY.HUMAN_GP_PER_LEVEL;
    const remainder = gp - spent;
    return { lvl, spent, remainder };
  };

  const chestRes = gpToLevels(oldChest * 10);
  newAllocation.chest = chestRes.lvl;

  // Back splits into upper_back and lower_back
  const backGpHalf = (oldBack * 10) / 2;
  const upperBackRes = gpToLevels(Math.ceil(backGpHalf));
  const lowerBackRes = gpToLevels(Math.floor(backGpHalf));
  newAllocation.upper_back = upperBackRes.lvl;
  newAllocation.lower_back = lowerBackRes.lvl;

  // Arms splits into upper_arms and forearms
  const armsGpHalf = (oldArms * 10) / 2;
  const upperArmsRes = gpToLevels(Math.ceil(armsGpHalf));
  const forearmsRes = gpToLevels(Math.floor(armsGpHalf));
  newAllocation.upper_arms = upperArmsRes.lvl;
  newAllocation.forearms = forearmsRes.lvl;

  // Shoulders
  const shouldersRes = gpToLevels(oldShoulders * 10);
  newAllocation.shoulders = shouldersRes.lvl;

  // Core -> abs_core
  const coreRes = gpToLevels(oldCore * 10);
  newAllocation.abs_core = coreRes.lvl;

  // Legs splits into thighs and calves
  const legsGpHalf = (oldLegs * 10) / 2;
  const thighsRes = gpToLevels(Math.ceil(legsGpHalf));
  const calvesRes = gpToLevels(Math.floor(legsGpHalf));
  newAllocation.thighs = thighsRes.lvl;
  newAllocation.calves = calvesRes.lvl;

  // Neck starts at 0
  newAllocation.neck = 0;

  // Calculate new total GP spent
  let newTotalGpSpent = 0;
  let totalNewLevels = 0;
  for (const r of HUMAN_MUSCLE_REGIONS) {
    const lvl = newAllocation[r.id] || 0;
    newTotalGpSpent += lvl * GAME_ECONOMY.HUMAN_GP_PER_LEVEL;
    totalNewLevels += lvl;
  }

  // Exact conservation: Any difference between old invested GP and new levels is credited back to wallet!
  const refundedGp = Math.max(0, oldInvestedGp - newTotalGpSpent);
  const newGrowthPoints = wallet.growthPoints + refundedGp;

  const newWallet: WalletState = {
    ...wallet,
    growthPoints: newGrowthPoints,
    totalGpSpent: newTotalGpSpent,
    migrationMarker: GAME_ECONOMY.MIGRATION_MARKER_V2,
  };

  const newAvatar: AvatarProgression = {
    ...avatar,
    muscleAllocation: newAllocation,
    developmentUnitsTotal: totalNewLevels * GAME_ECONOMY.HUMAN_UNITS_PER_LEVEL,
  };

  const tx: TransactionRecord = {
    id: `tx_migration_v2_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'migration',
    amount: refundedGp,
    balanceAfter: newGrowthPoints,
    referenceId: 'migration_v2_ten_groups',
    description: `Migrated to 10-group Human muscle architecture. Conserved ${oldInvestedGp} GP invested (${newTotalGpSpent} GP in muscle levels + ${refundedGp} GP refunded).`,
  };

  return {
    wallet: newWallet,
    avatar: newAvatar,
    transactions: [tx],
    migrated: true,
  };
}

/**
 * Credits Growth Points atomically when an XP reward event occurs.
 * Prevents duplicate rewards by checking transaction reference ID.
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
 * Calculates the GP cost to upgrade a region from currentLevel to targetLevel.
 */
export function calculateRegionCost(
  currentLevel: number,
  targetLevel: number,
  isAwakened = false
): number {
  if (targetLevel <= currentLevel) return 0;
  const diff = targetLevel - currentLevel;
  const costPerLevel = isAwakened
    ? GAME_ECONOMY.FANTASY_GP_PER_LEVEL
    : GAME_ECONOMY.HUMAN_GP_PER_LEVEL;
  return diff * costPerLevel;
}

/**
 * Calculates balanced allocation cost across all active regions to reach a minimum uniform level.
 */
export function calculateBalancedAllocation(
  current: MuscleAllocation,
  targetUniformLevel: number,
  isAwakened = false
): { totalCost: number; newAllocation: MuscleAllocation } {
  let totalCost = 0;
  const newAllocation: MuscleAllocation = { ...current };
  const regions = isAwakened ? FANTASY_MUSCLE_REGIONS : HUMAN_MUSCLE_REGIONS;
  const costPerLevel = isAwakened
    ? GAME_ECONOMY.FANTASY_GP_PER_LEVEL
    : GAME_ECONOMY.HUMAN_GP_PER_LEVEL;

  for (const region of regions) {
    const curLevel = current[region.id] || 0;
    if (curLevel < targetUniformLevel) {
      const diff = targetUniformLevel - curLevel;
      totalCost += diff * costPerLevel;
      newAllocation[region.id] = targetUniformLevel;
    }
  }

  return { totalCost, newAllocation };
}

/**
 * Checks if avatar meets the first evolution threshold (all 10 Human regions at level >= 3, 240 GP).
 */
export function checkEvolutionEligibility(
  allocation: MuscleAllocation,
  stage: 'human' | 'awakened' = 'human'
): {
  eligible: boolean;
  currentLevels: Record<string, number>;
  requiredLevel: number;
  totalGpInvestedInThreshold: number;
  missingRegions: string[];
} {
  if (stage === 'awakened') {
    return {
      eligible: true,
      currentLevels: { ...allocation },
      requiredLevel: GAME_ECONOMY.EVOLUTION_REQUIRED_HUMAN_LEVEL,
      totalGpInvestedInThreshold: GAME_ECONOMY.EVOLUTION_UNLOCK_TOTAL_GP,
      missingRegions: [],
    };
  }

  const missingRegions: string[] = [];
  let totalLevelsTowardsThreshold = 0;

  for (const r of HUMAN_MUSCLE_REGIONS) {
    const lvl = allocation[r.id] || 0;
    totalLevelsTowardsThreshold += Math.min(lvl, GAME_ECONOMY.EVOLUTION_REQUIRED_HUMAN_LEVEL);
    if (lvl < GAME_ECONOMY.EVOLUTION_REQUIRED_HUMAN_LEVEL) {
      missingRegions.push(r.id);
    }
  }

  return {
    eligible: missingRegions.length === 0,
    currentLevels: { ...allocation },
    requiredLevel: GAME_ECONOMY.EVOLUTION_REQUIRED_HUMAN_LEVEL,
    totalGpInvestedInThreshold:
      totalLevelsTowardsThreshold * GAME_ECONOMY.HUMAN_GP_PER_LEVEL,
    missingRegions,
  };
}

/**
 * Checks combination title criteria against an allocation.
 * Returns all titles that qualify.
 */
export function checkTitleUnlocks(
  allocation: MuscleAllocation,
  isAwakened = false
): string[] {
  const unlocked: string[] = [];

  for (const title of COMBINATION_TITLES) {
    let qualifies = true;
    for (const group of title.requiredGroups) {
      // Map front_side_shoulders to shoulders in human stage if needed
      const lookupKey = !isAwakened && group === 'front_side_shoulders' ? 'shoulders' : group;
      const lvl = allocation[lookupKey] || 0;
      if (lvl < title.requiredLevel) {
        qualifies = false;
        break;
      }
    }
    if (qualifies) {
      unlocked.push(title.id);
    }
  }

  return unlocked;
}

/**
 * Spends Growth Points atomically for muscle development.
 * Prevents negative balance, double clicks, and duplicate purchases.
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
  if (ledger.some((tx) => tx.id === `tx_spend_${purchaseId}`)) {
    return {
      success: false,
      newWallet: wallet,
      newAvatar: avatar,
      newLedger: ledger,
      error: 'Duplicate transaction detected.',
    };
  }

  const isAwakened = avatar.evolutionStage === 'awakened';
  const activeRegions = isAwakened ? FANTASY_MUSCLE_REGIONS : HUMAN_MUSCLE_REGIONS;
  const maxLvl = isAwakened ? GAME_ECONOMY.FANTASY_MAX_LEVEL : GAME_ECONOMY.HUMAN_MAX_LEVEL;
  const costPerLevel = isAwakened
    ? GAME_ECONOMY.FANTASY_GP_PER_LEVEL
    : GAME_ECONOMY.HUMAN_GP_PER_LEVEL;
  const unitsPerLevel = isAwakened
    ? GAME_ECONOMY.FANTASY_UNITS_PER_LEVEL
    : GAME_ECONOMY.HUMAN_UNITS_PER_LEVEL;

  let totalCost = 0;
  let addedLevels = 0;

  for (const r of activeRegions) {
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
    if (next > maxLvl) {
      return {
        success: false,
        newWallet: wallet,
        newAvatar: avatar,
        newLedger: ledger,
        error: `Max muscle level for this stage is ${maxLvl}.`,
      };
    }
    const diff = next - prev;
    totalCost += diff * costPerLevel;
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

  if (wallet.growthPoints < totalCost) {
    return {
      success: false,
      newWallet: wallet,
      newAvatar: avatar,
      newLedger: ledger,
      error: `Insufficient Growth Points. Need ${totalCost} GP, but wallet has ${wallet.growthPoints} GP.`,
    };
  }

  const addedUnits = addedLevels * unitsPerLevel;
  const newUnitsTotal = avatar.developmentUnitsTotal + addedUnits;

  // Calculate unlocked mutations for awakened lineages
  const newUnlockedTiers: number[] = [...avatar.unlockedMutationTiers];
  if (isAwakened && avatar.lineage !== 'human') {
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

  // Check permanent combination titles
  const earnedTitleIds = checkTitleUnlocks(newAllocation, isAwakened);
  const existingTitles = new Set(avatar.unlockedTitles || []);
  earnedTitleIds.forEach((t) => existingTitles.add(t));

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
    unlockedTitles: Array.from(existingTitles),
  };

  const newTx: TransactionRecord = {
    id: `tx_spend_${purchaseId}`,
    timestamp: new Date().toISOString(),
    type: 'spend_muscle',
    amount: -totalCost,
    balanceAfter,
    referenceId: purchaseId,
    description: `${description} (-${totalCost} GP, +${addedUnits} dev units)`,
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
 * - Requires eligibility (all 10 human regions level >= 3 = 240 GP).
 * - Only one awakening per character.
 * - Preserves: identity, customization, cosmetics, achievements, lifetime XP, unspent GP, earned titles.
 * - Archives: the previous form in archivedForms.
 * - Resets: muscle development to the new species' slender baseline (all 15 fantasy groups at 0).
 * - Applies: permanent lineage ('werewolf' | 'tigerhuman') and 1.5x muscle growth rate (Fantasy stage).
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

  const eligibility = checkEvolutionEligibility(avatar.muscleAllocation, 'human');
  if (!eligibility.eligible) {
    return {
      success: false,
      newAvatar: avatar,
      error: `All ten muscle regions must reach level 3 to evolve. Missing: ${eligibility.missingRegions.join(', ')}.`,
    };
  }

  // Archive previous human form
  const archiveEntry: ArchivedForm = {
    lineage: avatar.lineage,
    evolutionStage: avatar.evolutionStage,
    archivedAt: new Date().toISOString(),
    muscleAllocation: { ...avatar.muscleAllocation },
    developmentUnitsTotal: avatar.developmentUnitsTotal,
  };

  const existingArchives = avatar.archivedForms || [];

  const newAvatar: AvatarProgression = {
    ...avatar,
    lineage: chosenLineage,
    evolutionStage: 'awakened',
    hasAwakened: true,
    awakenedAt: new Date().toISOString(),
    // Reset to the new species' slender baseline across all 15 fantasy groups
    muscleAllocation: { ...DEFAULT_FANTASY_MUSCLE_ALLOCATION },
    developmentUnitsTotal: 0,
    unlockedMutationTiers: [],
    archivedForms: [...existingArchives, archiveEntry],
    // Earned titles remain permanent
    unlockedTitles: avatar.unlockedTitles || [],
    selectedTitle: avatar.selectedTitle || null,
  };

  return {
    success: true,
    newAvatar,
  };
}

/**
 * Registry of valid promotional/redeem codes.
 */
export const PROMO_CODES: Record<string, { gpReward: number; description: string }> = {
  gpzoo: {
    gpReward: 1000,
    description: 'Special ZooGrow Bonus (+1,000 GP)',
  },
};

/**
 * Redeem a promotional code to receive spendable Growth Points (GP).
 * Idempotent: Prevents redeeming the exact same code twice on the same account.
 */
export function redeemPromoCode(
  wallet: WalletState,
  code: string,
  ledger: TransactionRecord[] = []
): {
  success: boolean;
  newWallet: WalletState;
  newLedger: TransactionRecord[];
  rewardGp: number;
  error?: string;
} {
  const normalized = (code || '').trim().toLowerCase();
  if (!normalized) {
    return {
      success: false,
      newWallet: wallet,
      newLedger: ledger,
      rewardGp: 0,
      error: 'Please enter a redeem code.',
    };
  }

  const promo = PROMO_CODES[normalized];
  if (!promo) {
    return {
      success: false,
      newWallet: wallet,
      newLedger: ledger,
      rewardGp: 0,
      error: 'Invalid redeem code. Please check and try again.',
    };
  }

  const redeemed = wallet.redeemedCodes || [];
  if (redeemed.includes(normalized)) {
    return {
      success: false,
      newWallet: wallet,
      newLedger: ledger,
      rewardGp: 0,
      error: `Code "${normalized}" has already been redeemed on this account.`,
    };
  }

  const newBalance = (wallet.growthPoints || 0) + promo.gpReward;
  const newLifetimeGp = (wallet.lifetimeGpEarned || 0) + promo.gpReward;

  const newWallet: WalletState = {
    ...wallet,
    growthPoints: newBalance,
    lifetimeGpEarned: newLifetimeGp,
    redeemedCodes: [...redeemed, normalized],
  };

  const newTx: TransactionRecord = {
    id: `tx_redeem_${normalized}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'redeem_code',
    amount: promo.gpReward,
    balanceAfter: newBalance,
    referenceId: `redeem_${normalized}`,
    description: `Redeemed promo code "${normalized}": ${promo.description}`,
  };

  return {
    success: true,
    newWallet,
    newLedger: [newTx, ...ledger],
    rewardGp: promo.gpReward,
  };
}

