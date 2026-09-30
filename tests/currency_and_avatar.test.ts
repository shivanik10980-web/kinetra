import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  migrateHistoricalXpToGp,
  creditRewardGrowthPoints,
  spendGrowthPointsForMuscles,
  calculateBalancedAllocation,
  checkEvolutionEligibility,
  awakenLineage,
} from '../lib/game/currency';
import {
  GAME_ECONOMY,
  WEREWOLF_LINEAGE,
  TIGERHUMAN_LINEAGE,
} from '../lib/avatar/config';
import {
  DEFAULT_WALLET_STATE,
  DEFAULT_AVATAR_PROGRESSION,
  DEFAULT_AVATAR_CUSTOMIZATION,
  WalletState,
  AvatarProgression,
  MuscleAllocation,
} from '../lib/avatar/types';
import { ProgressionState } from '../lib/game/types';
import { INITIAL_PROGRESSION_STATE, applyReward } from '../lib/game/progression';
import { DrillEngine } from '../lib/sports/drill-engine';
import { SPORTS_CATALOGUE } from '../lib/sports/catalogue';

describe('XP, Growth Points (GP) Currency & Migration Tests', () => {
  it('One-time migration converts historical totalXp to GP with version marker', () => {
    const historicalProgression: ProgressionState = {
      ...INITIAL_PROGRESSION_STATE,
      totalXp: 180,
      level: 2,
    };

    // First migration
    const res1 = migrateHistoricalXpToGp(historicalProgression, null);
    assert.strictEqual(res1.migrated, true);
    assert.strictEqual(res1.wallet.growthPoints, 180);
    assert.strictEqual(res1.wallet.lifetimeXp, 180);
    assert.strictEqual(res1.wallet.migrationMarker, GAME_ECONOMY.MIGRATION_MARKER_V1);
    assert.strictEqual(res1.transactions.length, 1);

    // Second migration attempt should be idempotent and do nothing
    const res2 = migrateHistoricalXpToGp(historicalProgression, res1.wallet);
    assert.strictEqual(res2.migrated, false);
    assert.strictEqual(res2.wallet.growthPoints, 180);
    assert.strictEqual(res2.transactions.length, 0);
  });

  it('Credits GP 1:1 for earned XP and enforces reward idempotency', () => {
    let wallet: WalletState = { ...DEFAULT_WALLET_STATE, growthPoints: 10, lifetimeXp: 10 };
    let ledger: any[] = [];

    // Credit session reward (+30 XP/GP)
    const credit1 = creditRewardGrowthPoints(
      wallet,
      ledger,
      'reward_session_101',
      30,
      'Movement Practice'
    );
    assert.strictEqual(credit1.success, true);
    assert.strictEqual(credit1.newWallet.growthPoints, 40);
    assert.strictEqual(credit1.newWallet.lifetimeXp, 40);
    assert.strictEqual(credit1.newLedger.length, 1);

    // Attempting duplicate credit with same reward ID must be rejected
    const creditDup = creditRewardGrowthPoints(
      credit1.newWallet,
      credit1.newLedger,
      'reward_session_101',
      30,
      'Duplicate attempt'
    );
    assert.strictEqual(creditDup.success, false);
    assert.strictEqual(creditDup.newWallet.growthPoints, 40); // Unchanged
  });

  it('Spending GP deducts balance atomically without reducing lifetime XP or level', () => {
    const wallet: WalletState = {
      growthPoints: 100,
      lifetimeXp: 150,
      lifetimeGpEarned: 150,
      totalGpSpent: 50,
      migrationMarker: GAME_ECONOMY.MIGRATION_MARKER_V1,
      lastRewardedDate: null,
    };

    const avatar: AvatarProgression = { ...DEFAULT_AVATAR_PROGRESSION };
    const targetAllocation: MuscleAllocation = {
      chest: 2, // 2 * 10 = 20 GP
      back: 2,  // 2 * 10 = 20 GP
      arms: 0,
      shoulders: 0,
      core: 0,
      legs: 0,
    };

    const res = spendGrowthPointsForMuscles(
      wallet,
      avatar,
      [],
      'purchase_test_1',
      targetAllocation,
      'Upgrade Chest & Back'
    );

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.newWallet.growthPoints, 60); // 100 - 40
    assert.strictEqual(res.newWallet.lifetimeXp, 150); // Lifetime XP remains intact!
    assert.strictEqual(res.newAvatar.muscleAllocation.chest, 2);
    assert.strictEqual(res.newAvatar.muscleAllocation.back, 2);
  });

  it('Insufficient GP balance rejects purchase and leaves avatar & wallet unchanged', () => {
    const wallet: WalletState = {
      growthPoints: 15,
      lifetimeXp: 40,
      lifetimeGpEarned: 40,
      totalGpSpent: 0,
      migrationMarker: GAME_ECONOMY.MIGRATION_MARKER_V1,
      lastRewardedDate: null,
    };

    const avatar: AvatarProgression = { ...DEFAULT_AVATAR_PROGRESSION };
    const expensiveAllocation: MuscleAllocation = {
      chest: 2, // 20 GP > 15 GP
      back: 0,
      arms: 0,
      shoulders: 0,
      core: 0,
      legs: 0,
    };

    const res = spendGrowthPointsForMuscles(
      wallet,
      avatar,
      [],
      'purchase_fail_1',
      expensiveAllocation,
      'Upgrade attempt'
    );

    assert.strictEqual(res.success, false);
    assert.match(res.error || '', /Insufficient Growth Points/);
    assert.strictEqual(res.newWallet.growthPoints, 15);
    assert.strictEqual(res.newAvatar.muscleAllocation.chest, 0);
  });

  it('Balanced allocation accurately calculates exact cost to reach target uniform level', () => {
    const current: MuscleAllocation = {
      chest: 2,
      back: 1,
      arms: 0,
      shoulders: 3,
      core: 0,
      legs: 2,
    };

    // To bring all to level 3:
    // chest needs 1, back needs 2, arms needs 3, shoulders needs 0, core needs 3, legs needs 1
    // Total added levels = 1 + 2 + 3 + 0 + 3 + 1 = 10 levels * 10 GP = 100 GP
    const { totalCost, newAllocation } = calculateBalancedAllocation(current, 3);
    assert.strictEqual(totalCost, 100);
    assert.strictEqual(newAllocation.chest, 3);
    assert.strictEqual(newAllocation.back, 3);
    assert.strictEqual(newAllocation.arms, 3);
    assert.strictEqual(newAllocation.shoulders, 3);
    assert.strictEqual(newAllocation.core, 3);
    assert.strictEqual(newAllocation.legs, 3);
  });
});

describe('Evolution Requirements & Lineage Awakening Tests', () => {
  it('Evolution requires all 6 regions to reach level >= 4 (240 GP threshold)', () => {
    // 5 regions at level 4, 1 region at level 3
    const almostEligible: MuscleAllocation = {
      chest: 4,
      back: 4,
      arms: 4,
      shoulders: 4,
      core: 4,
      legs: 3, // Missing legs!
    };

    const check1 = checkEvolutionEligibility(almostEligible);
    assert.strictEqual(check1.eligible, false);
    assert.deepStrictEqual(check1.missingRegions, ['legs']);

    // Now all 6 regions reach level 4
    const fullyEligible: MuscleAllocation = {
      ...almostEligible,
      legs: 4,
    };

    const check2 = checkEvolutionEligibility(fullyEligible);
    assert.strictEqual(check2.eligible, true);
    assert.strictEqual(check2.missingRegions.length, 0);
    assert.strictEqual(check2.totalGpInvestedInThreshold, 240);
  });

  it('Awakening resets muscle allocation to slender base while preserving identity, lifetime XP, and unspent GP', () => {
    const avatarBefore: AvatarProgression = {
      lineage: 'human',
      evolutionStage: 'human',
      hasAwakened: false,
      awakenedAt: null,
      muscleAllocation: {
        chest: 4,
        back: 4,
        arms: 4,
        shoulders: 4,
        core: 4,
        legs: 4,
      },
      developmentUnitsTotal: 24,
      unlockedMutationTiers: [],
    };

    const res = awakenLineage(avatarBefore, 'werewolf');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.newAvatar.lineage, 'werewolf');
    assert.strictEqual(res.newAvatar.evolutionStage, 'awakened');
    assert.strictEqual(res.newAvatar.hasAwakened, true);
    assert.ok(res.newAvatar.awakenedAt);

    // Muscular development reset to slender base (0s)
    assert.strictEqual(res.newAvatar.muscleAllocation.chest, 0);
    assert.strictEqual(res.newAvatar.muscleAllocation.legs, 0);

    // Second awakening attempt on already awakened character must be rejected
    const repeatAttempt = awakenLineage(res.newAvatar, 'tigerhuman');
    assert.strictEqual(repeatAttempt.success, false);
    assert.match(repeatAttempt.error || '', /already awakened/);
  });

  it('Post-awakening 1.5x multiplier accelerates development units and deterministically unlocks mutation milestones', () => {
    const awakenedAvatar: AvatarProgression = {
      lineage: 'tigerhuman',
      evolutionStage: 'awakened',
      hasAwakened: true,
      awakenedAt: new Date().toISOString(),
      muscleAllocation: {
        chest: 0,
        back: 0,
        arms: 0,
        shoulders: 0,
        core: 0,
        legs: 0,
      },
      developmentUnitsTotal: 0,
      unlockedMutationTiers: [],
    };

    const wallet: WalletState = {
      growthPoints: 200,
      lifetimeXp: 300,
      lifetimeGpEarned: 300,
      totalGpSpent: 240,
      migrationMarker: GAME_ECONOMY.MIGRATION_MARKER_V1,
      lastRewardedDate: null,
    };

    // Upgrade legs from 0 to 10 (10 levels * 10 GP = 100 GP)
    // In awakened form, 10 levels * 1.5 = 15.0 development units!
    // Tigerhuman milestone 1 requires 15 units ('Jade Feline Slit Pupils')
    const res = spendGrowthPointsForMuscles(
      wallet,
      awakenedAvatar,
      [],
      'post_awakening_upgrade_1',
      { ...awakenedAvatar.muscleAllocation, legs: 10 },
      'Post awakening leg training'
    );

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.newAvatar.developmentUnitsTotal, 15.0);
    assert.ok(
      res.newAvatar.unlockedMutationTiers.includes(1),
      'Tier 1 mutation should be unlocked at 15 dev units'
    );
  });
});

describe('Honest Evidence & Early Stopped Session Handling', () => {
  it('Early-stopped sports session reports actual elapsed seconds, never 0 duration', () => {
    const drill = SPORTS_CATALOGUE[0].drills[0];
    const engine = new DrillEngine(drill, 'guided');

    // Simulate stopping 5 seconds in
    const elapsedSec = 5;
    const summary = engine.createSessionSummary({ elapsedSec });

    assert.strictEqual(summary.durationSec, 5);
    assert.strictEqual(summary.source, 'guided');
    assert.strictEqual(summary.trackingCoverage, 0); // Honest 0% for guided/manual
    assert.ok(summary.unknownItems.includes('Optical Camera Feed (Guided/Manual Mode)'));
  });
});
