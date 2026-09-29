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
  test('Daily cap formula: min(40, 30*slot + 10*reflection)', () => {
    assert.equal(calculateDailyCap(false, false), 0);
    assert.equal(calculateDailyCap(true, false), 30);
    assert.equal(calculateDailyCap(false, true), 10);
    assert.equal(calculateDailyCap(true, true), 40);
  });

  test('Enforces strict daily cap of 40 XP and idempotency on duplicate eventId', () => {
    let state = { ...INITIAL_PROGRESSION_STATE };
    const dateKey = '2026-09-30';

    // 1. Complete slot (+30 XP)
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

    // 3. User attempts another slot on same day -> daily slot already completed, 0 XP
    const resSlot2 = applyReward(state, {
      eventId: 'evt_slot_2',
      type: 'slot',
      source: 'live',
      dateKey,
    });
    assert.equal(resSlot2.awardedXp, 0);
    assert.equal(resSlot2.newState.totalXp, 30);

    // 4. User does reflection (+10 XP)
    const resReflect = applyReward(state, {
      eventId: 'evt_reflection_1',
      type: 'reflection',
      source: 'guided',
      dateKey,
    });
    assert.equal(resReflect.awardedXp, 10);
    state = resReflect.newState;
    assert.equal(state.totalXp, 40); // Cap of 40 reached for the day

    // 5. Any further events on the same day award 0 XP
    const resOverflow = applyReward(state, {
      eventId: 'evt_reflection_2',
      type: 'reflection',
      source: 'guided',
      dateKey,
    });
    assert.equal(resOverflow.awardedXp, 0);
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
