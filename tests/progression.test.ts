import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDailyCap,
  calculateLevel,
  calculateRank,
  applyReward,
  INITIAL_PROGRESSION_STATE,
} from '../lib/game/progression';

describe('Game Progression & Reward System Tests', () => {
  test('Daily cap formula: min(60, 30*slot + 10*reflection + 10*planned + 5*mastery + booster)', () => {
    assert.equal(calculateDailyCap(false, false), 0);
    assert.equal(calculateDailyCap(true, false), 30);
    assert.equal(calculateDailyCap(false, true), 10);
    assert.equal(calculateDailyCap(true, true), 40);
    assert.equal(calculateDailyCap(true, true, true), 50); // +10 planned practice
    assert.equal(calculateDailyCap(true, true, true, true), 55); // +5 mastery bonus
    assert.equal(calculateDailyCap(true, true, true, true, 5), 60); // +5 booster contribution = 60 cap
    assert.equal(calculateDailyCap(true, true, true, true, 10), 60); // Clamped at 60
  });

  test('Enforces strict daily cap of 60 XP, multi-reward bonuses, and continued logging', () => {
    let state = { ...INITIAL_PROGRESSION_STATE };
    const dateKey = '2026-09-30';

    // 1. Complete daily participation slot (+30 XP)
    const res1 = applyReward(state, {
      eventId: 'evt_slot_1',
      type: 'slot',
      source: 'live',
      dateKey,
    });
    assert.equal(res1.awardedXp, 30);
    assert.equal(res1.isDuplicate, false);
    state = res1.newState;
    assert.equal(state.totalXp, 30);

    // 2. Retry exact same eventId -> duplicate, 0 XP
    const resDuplicate = applyReward(state, {
      eventId: 'evt_slot_1',
      type: 'slot',
      source: 'live',
      dateKey,
    });
    assert.equal(resDuplicate.awardedXp, 0);
    assert.equal(resDuplicate.isDuplicate, true);
    assert.equal(resDuplicate.newState.totalXp, 30);

    // 3. User does reflection (+10 XP)
    const resReflect = applyReward(state, {
      eventId: 'evt_reflection_1',
      type: 'reflection',
      source: 'guided',
      dateKey,
    });
    assert.equal(resReflect.awardedXp, 10);
    state = resReflect.newState;
    assert.equal(state.totalXp, 40);

    // 4. User completes a planned practice block (+10 XP)
    const resPlanned = applyReward(state, {
      eventId: 'evt_planned_1',
      type: 'planned_practice',
      source: 'live',
      dateKey,
    });
    assert.equal(resPlanned.awardedXp, 10);
    state = resPlanned.newState;
    assert.equal(state.totalXp, 50);

    // 5. User earns exercise mastery milestone bonus (+5 XP)
    const resMastery = applyReward(state, {
      eventId: 'evt_mastery_1',
      type: 'mastery',
      source: 'live',
      dateKey,
    });
    assert.equal(resMastery.awardedXp, 5);
    state = resMastery.newState;
    assert.equal(state.totalXp, 55);

    // 6. User applies a Focus Token booster contribution (+5 XP)
    const resBooster = applyReward(state, {
      eventId: 'evt_booster_1',
      type: 'booster',
      source: 'live',
      dateKey,
      details: { boosterAmount: 5 },
    });
    assert.equal(resBooster.awardedXp, 5);
    state = resBooster.newState;
    assert.equal(state.totalXp, 60); // Cap of 60 reached for the day!

    // 7. Continued logging after cap: session is logged into ledger, but 0 further XP awarded
    const resContinuedLogging = applyReward(state, {
      eventId: 'evt_extra_session_1',
      type: 'slot',
      source: 'live',
      dateKey,
    });
    assert.equal(resContinuedLogging.awardedXp, 0);
    assert.equal(resContinuedLogging.newState.totalXp, 60);
    // Verified event was logged in eventIds
    assert.ok(
      resContinuedLogging.newState.dailyLedgers[dateKey].eventIds.includes(
        'evt_extra_session_1'
      )
    );
  });

  test('Guided mode and rest alternatives have equal participation XP parity (30 XP)', () => {
    let state = { ...INITIAL_PROGRESSION_STATE };
    const dateKey = '2026-10-01';

    // Seated guided slot
    const resGuided = applyReward(state, {
      eventId: 'evt_guided_1',
      type: 'slot',
      source: 'guided',
      dateKey,
      details: { movement: 'seated_guided' },
    });

    assert.equal(resGuided.awardedXp, 30, 'Guided mode earns full 30 XP parity');
    assert.ok(resGuided.newBadges.includes('mobility_explorer'));
  });

  test('Demo isolation: simulated demo events cannot alter real ledger or award XP', () => {
    const state = { ...INITIAL_PROGRESSION_STATE };
    const res = applyReward(state, {
      eventId: 'demo_event_1',
      type: 'slot',
      source: 'demo', // Synthetic demo
      dateKey: '2026-09-30',
    });

    assert.equal(res.awardedXp, 0);
    assert.equal(res.isDemoBlocked, true);
    assert.equal(res.newState.totalXp, 0);
    assert.equal(Object.keys(res.newState.dailyLedgers).length, 0);
  });

  test('Level and Rank calculation progression', () => {
    // Level = 1 + floor(XP / 100)
    assert.equal(calculateLevel(0), 1);
    assert.equal(calculateLevel(99), 1);
    assert.equal(calculateLevel(100), 2);
    assert.equal(calculateLevel(350), 4);

    // Ranks
    const rank0 = calculateRank(0);
    assert.equal(rank0.rank, 'Initiate');
    assert.equal(rank0.xpToNextRank, 120);

    const rank120 = calculateRank(120);
    assert.equal(rank120.rank, 'Explorer');
    assert.equal(rank120.nextRankMinXp, 360);
    assert.equal(rank120.xpToNextRank, 240);

    const rank360 = calculateRank(360);
    assert.equal(rank360.rank, 'Navigator');

    const rank720 = calculateRank(720);
    assert.equal(rank720.rank, 'Pathfinder');

    const rank1200 = calculateRank(1200);
    assert.equal(rank1200.rank, 'Guide');
    assert.equal(rank1200.nextRankMinXp, null);
    assert.equal(rank1200.xpToNextRank, null);
  });
});
