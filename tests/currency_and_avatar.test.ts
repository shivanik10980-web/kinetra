import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  migrateHistoricalXpToGp,
  migrateToTenMuscleGroups,
  creditRewardGrowthPoints,
  spendGrowthPointsForMuscles,
  calculateBalancedAllocation,
  checkEvolutionEligibility,
  checkTitleUnlocks,
  awakenLineage,
} from '../lib/game/currency';
import {
  GAME_ECONOMY,
  WEREWOLF_LINEAGE,
  TIGERHUMAN_LINEAGE,
  HUMAN_MUSCLE_REGIONS,
  FANTASY_MUSCLE_REGIONS,
  COMBINATION_TITLES,
} from '../lib/avatar/config';
import {
  DEFAULT_WALLET_STATE,
  DEFAULT_AVATAR_PROGRESSION,
  DEFAULT_AVATAR_CUSTOMIZATION,
  DEFAULT_HUMAN_MUSCLE_ALLOCATION,
  DEFAULT_FANTASY_MUSCLE_ALLOCATION,
  WalletState,
  AvatarProgression,
  MuscleAllocation,
} from '../lib/avatar/types';
import { ProgressionState } from '../lib/game/types';
import { INITIAL_PROGRESSION_STATE } from '../lib/game/progression';
import { DrillEngine } from '../lib/sports/drill-engine';
import { SPORTS_CATALOGUE } from '../lib/sports/catalogue';
import { consumeBoosterOnRewardSave } from '../lib/game/boosters';

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
    assert.strictEqual(res1.transactions.length, 1);

    // Second migration attempt should be idempotent and do nothing
    const res2 = migrateHistoricalXpToGp(historicalProgression, res1.wallet);
    assert.strictEqual(res2.migrated, false);
    assert.strictEqual(res2.wallet.growthPoints, 180);
    assert.strictEqual(res2.transactions.length, 0);
  });

  it('Migration v2: Deterministically converts legacy 6 groups to 10 Human groups conserving 100% of invested GP value', () => {
    // Simulate user with legacy 6-group investment:
    // chest: 4 (40 GP), back: 4 (40 GP), arms: 4 (40 GP), shoulders: 4 (40 GP), core: 4 (40 GP), legs: 4 (40 GP)
    // Total old invested GP = 6 * 4 * 10 = 240 GP
    const legacyWallet: WalletState = {
      growthPoints: 50,
      lifetimeXp: 290,
      lifetimeGpEarned: 290,
      totalGpSpent: 240,
      migrationMarker: 'gp_migration_v1',
      lastRewardedDate: null,
    };

    const legacyAvatar: AvatarProgression = {
      ...DEFAULT_AVATAR_PROGRESSION,
      muscleAllocation: {
        chest: 4,
        back: 4,
        arms: 4,
        shoulders: 4,
        core: 4,
        legs: 4,
      },
    };

    const res = migrateToTenMuscleGroups(legacyWallet, legacyAvatar);
    assert.strictEqual(res.migrated, true);
    assert.strictEqual(res.wallet.migrationMarker, GAME_ECONOMY.MIGRATION_MARKER_V2);

    // Sum of new muscle allocation GP + refunded GP must EXACTLY equal 240 GP (100% conservation)
    let newInvestedGp = 0;
    for (const r of HUMAN_MUSCLE_REGIONS) {
      newInvestedGp += (res.avatar.muscleAllocation[r.id] || 0) * GAME_ECONOMY.HUMAN_GP_PER_LEVEL;
    }

    const netWalletDifference = res.wallet.growthPoints - legacyWallet.growthPoints;
    assert.strictEqual(
      newInvestedGp + netWalletDifference,
      240,
      'Total invested GP value must be 100% conserved without duplication or loss'
    );
    assert.strictEqual(
      res.wallet.growthPoints + res.wallet.totalGpSpent,
      res.wallet.lifetimeGpEarned,
      'Wallet accounting balance check: growthPoints + totalGpSpent == lifetimeGpEarned'
    );
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
      migrationMarker: GAME_ECONOMY.MIGRATION_MARKER_V2,
      lastRewardedDate: null,
    };

    const avatar: AvatarProgression = { ...DEFAULT_AVATAR_PROGRESSION };
    const targetAllocation: MuscleAllocation = {
      ...avatar.muscleAllocation,
      chest: 2,      // 2 * 8 = 16 GP
      upper_back: 2, // 2 * 8 = 16 GP
    };

    const res = spendGrowthPointsForMuscles(
      wallet,
      avatar,
      [],
      'purchase_test_1',
      targetAllocation,
      'Upgrade Chest & Upper Back'
    );

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.newWallet.growthPoints, 68); // 100 - 32
    assert.strictEqual(res.newWallet.lifetimeXp, 150); // Lifetime XP remains intact!
    assert.strictEqual(res.newAvatar.muscleAllocation.chest, 2);
    assert.strictEqual(res.newAvatar.muscleAllocation.upper_back, 2);
  });

  it('Insufficient GP balance rejects purchase and leaves avatar & wallet unchanged', () => {
    const wallet: WalletState = {
      growthPoints: 10,
      lifetimeXp: 40,
      lifetimeGpEarned: 40,
      totalGpSpent: 0,
      migrationMarker: GAME_ECONOMY.MIGRATION_MARKER_V2,
      lastRewardedDate: null,
    };

    const avatar: AvatarProgression = { ...DEFAULT_AVATAR_PROGRESSION };
    const expensiveAllocation: MuscleAllocation = {
      ...avatar.muscleAllocation,
      chest: 2, // 16 GP > 10 GP
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
    assert.strictEqual(res.newWallet.growthPoints, 10);
    assert.strictEqual(res.newAvatar.muscleAllocation.chest, 0);
  });

  it('Balanced allocation accurately calculates exact cost to reach target uniform level across 10 Human regions', () => {
    const current: MuscleAllocation = {
      ...DEFAULT_HUMAN_MUSCLE_ALLOCATION,
      chest: 2,
      upper_back: 1,
      shoulders: 3,
      thighs: 2,
    };

    // Target uniform level 3:
    // chest needs 1, upper_back needs 2, lower_back needs 3, forearms needs 3, shoulders needs 0,
    // upper_arms needs 3, abs_core needs 3, thighs needs 1, calves needs 3, neck needs 3
    // Total missing levels = 1+2+3+3+0+3+3+1+3+3 = 22 levels * 8 GP = 176 GP
    const { totalCost, newAllocation } = calculateBalancedAllocation(current, 3, false);
    assert.strictEqual(totalCost, 176);
    assert.strictEqual(newAllocation.chest, 3);
    assert.strictEqual(newAllocation.upper_back, 3);
    assert.strictEqual(newAllocation.lower_back, 3);
    assert.strictEqual(newAllocation.forearms, 3);
    assert.strictEqual(newAllocation.shoulders, 3);
    assert.strictEqual(newAllocation.thighs, 3);
    assert.strictEqual(newAllocation.calves, 3);
    assert.strictEqual(newAllocation.neck, 3);
  });
});

describe('Evolution Requirements, Lineage Awakening & Titles Tests', () => {
  it('Evolution requires all 10 Human regions to reach level >= 3 (240 GP threshold)', () => {
    // 9 regions at level 3, 1 region at level 2
    const almostEligible: MuscleAllocation = {
      ...DEFAULT_HUMAN_MUSCLE_ALLOCATION,
      neck: 3,
      upper_back: 3,
      lower_back: 3,
      forearms: 3,
      shoulders: 3,
      upper_arms: 3,
      chest: 3,
      abs_core: 3,
      thighs: 3,
      calves: 2, // Missing calves!
    };

    const check1 = checkEvolutionEligibility(almostEligible, 'human');
    assert.strictEqual(check1.eligible, false);
    assert.deepStrictEqual(check1.missingRegions, ['calves']);

    // Now all 10 regions reach level 3
    const fullyEligible: MuscleAllocation = {
      ...almostEligible,
      calves: 3,
    };

    const check2 = checkEvolutionEligibility(fullyEligible, 'human');
    assert.strictEqual(check2.eligible, true);
    assert.strictEqual(check2.missingRegions.length, 0);
    assert.strictEqual(check2.totalGpInvestedInThreshold, 240); // 10 * 3 * 8 = 240 GP
  });

  it('Awakening resets muscle allocation to slender baseline, archives previous form, and preserves titles & GP', () => {
    const avatarBefore: AvatarProgression = {
      lineage: 'human',
      evolutionStage: 'human',
      hasAwakened: false,
      awakenedAt: null,
      muscleAllocation: {
        neck: 3,
        upper_back: 3,
        lower_back: 3,
        forearms: 3,
        shoulders: 3,
        upper_arms: 3,
        chest: 3,
        abs_core: 3,
        thighs: 3,
        calves: 3,
      },
      developmentUnitsTotal: 240,
      unlockedMutationTiers: [],
      archivedForms: [],
      unlockedTitles: ['athlete'],
      selectedTitle: 'athlete',
    };

    const res = awakenLineage(avatarBefore, 'werewolf');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.newAvatar.lineage, 'werewolf');
    assert.strictEqual(res.newAvatar.evolutionStage, 'awakened');
    assert.strictEqual(res.newAvatar.hasAwakened, true);
    assert.ok(res.newAvatar.awakenedAt);

    // Form was archived in history
    assert.strictEqual(res.newAvatar.archivedForms?.length, 1);
    assert.strictEqual(res.newAvatar.archivedForms?.[0].lineage, 'human');

    // Muscular development reset to slender baseline (0s across 15 fantasy groups)
    assert.strictEqual(res.newAvatar.muscleAllocation.chest, 0);
    assert.strictEqual(res.newAvatar.muscleAllocation.jaw, 0);
    assert.strictEqual(res.newAvatar.muscleAllocation.lats, 0);
    assert.strictEqual(res.newAvatar.muscleAllocation.thighs, 0);

    // Permanent titles preserved
    assert.ok(res.newAvatar.unlockedTitles?.includes('athlete'));

    // Second awakening attempt on already awakened character must be rejected
    const repeatAttempt = awakenLineage(res.newAvatar, 'tigerhuman');
    assert.strictEqual(repeatAttempt.success, false);
    assert.match(repeatAttempt.error || '', /already awakened/);
  });

  it('Combination titles unlock deterministically and remain permanently earned', () => {
    // Check 'Hunk' title: biceps, triceps, forearms >= 4
    const hunkAlloc: MuscleAllocation = {
      ...DEFAULT_FANTASY_MUSCLE_ALLOCATION,
      biceps: 4,
      triceps: 4,
      forearms: 4,
    };
    const titles1 = checkTitleUnlocks(hunkAlloc, true);
    assert.ok(titles1.includes('hunk'), 'Hunk title should be unlocked');

    // Check 'Ironjaw' title: jaw, neck, traps >= 4
    const ironjawAlloc: MuscleAllocation = {
      ...DEFAULT_FANTASY_MUSCLE_ALLOCATION,
      jaw: 4,
      neck: 4,
      traps: 4,
    };
    const titles2 = checkTitleUnlocks(ironjawAlloc, true);
    assert.ok(titles2.includes('ironjaw'), 'Ironjaw title should be unlocked');
  });

  it('Post-awakening growth tuning: 12 units/level (1.5 units/GP) unlocks mutation tiers', () => {
    const awakenedAvatar: AvatarProgression = {
      lineage: 'tigerhuman',
      evolutionStage: 'awakened',
      hasAwakened: true,
      awakenedAt: new Date().toISOString(),
      muscleAllocation: { ...DEFAULT_FANTASY_MUSCLE_ALLOCATION },
      developmentUnitsTotal: 0,
      unlockedMutationTiers: [],
      archivedForms: [],
    };

    const wallet: WalletState = {
      growthPoints: 200,
      lifetimeXp: 300,
      lifetimeGpEarned: 300,
      totalGpSpent: 240,
      migrationMarker: GAME_ECONOMY.MIGRATION_MARKER_V2,
      lastRewardedDate: null,
    };

    // Upgrade thighs from 0 to 2 (2 levels * 8 GP = 16 GP)
    // 2 levels * 12 units/level = 24 development units!
    // Tigerhuman milestone 1 requires 15 units ('Jade Feline Slit Pupils')
    const res = spendGrowthPointsForMuscles(
      wallet,
      awakenedAvatar,
      [],
      'post_awakening_upgrade_1',
      { ...awakenedAvatar.muscleAllocation, thighs: 2 },
      'Post awakening thigh training'
    );

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.newAvatar.developmentUnitsTotal, 24);
    assert.ok(
      res.newAvatar.unlockedMutationTiers.includes(1),
      'Tier 1 mutation should be unlocked at 24 dev units'
    );
  });
});

describe('Booster Economy Tests', () => {
  it('Consuming Focus Token adds bonus under shared 60 daily cap and updates inventory', () => {
    const wallet: WalletState = {
      growthPoints: 20,
      lifetimeXp: 20,
      lifetimeGpEarned: 20,
      totalGpSpent: 0,
      migrationMarker: GAME_ECONOMY.MIGRATION_MARKER_V2,
      lastRewardedDate: null,
      inventory: { focus_token: 2 },
    };

    // Current day XP earned is 30. Daily cap is 60. Remaining cap space = 30.
    // Focus token can contribute its full 5 points.
    const res = consumeBoosterOnRewardSave(wallet, [], 'focus_token', 'session_abc', 30);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.bonusXp, 5);
    assert.strictEqual(res.newWallet.growthPoints, 25);
    assert.strictEqual(res.newWallet.inventory?.focus_token, 1);
    assert.strictEqual(res.newLedger.length, 1);

    // If current day XP is already 58 (only 2 points left under 60 cap),
    // Focus token must strictly clamp to 2 points!
    const resClamped = consumeBoosterOnRewardSave(
      res.newWallet,
      res.newLedger,
      'focus_token',
      'session_def',
      58
    );
    assert.strictEqual(resClamped.success, true);
    assert.strictEqual(resClamped.bonusXp, 2);
    assert.strictEqual(resClamped.newWallet.growthPoints, 27);
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
