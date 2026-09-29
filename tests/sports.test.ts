import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DrillEngine } from '../lib/sports/drill-engine';
import { SPORTS_CATALOGUE } from '../lib/sports/catalogue';
import { generateSyntheticSquatLandmarks } from '../lib/synthetic/fixtures';
import { applyReward, INITIAL_PROGRESSION_STATE } from '../lib/game/progression';

describe('Sports Skill Lab Drill Engine Pure Tests', () => {
  const basketballStanceDrill = SPORTS_CATALOGUE[1].drills[0]; // Basketball Athletic Stance

  test('Drill increments interval on sustained target stance dwell (400ms)', () => {
    let completed = 0;
    const engine = new DrillEngine(basketballStanceDrill, 'live', {
      onIntervalCompleted: (c) => {
        completed = c;
      },
    });

    // Feed frames in target range (130 degrees, target is 115-145)
    // 1. Initial entry at 1000ms
    engine.processPoseFrame(generateSyntheticSquatLandmarks(130, 'left', 0.95), 1000, 640, 480);
    assert.equal(engine.getPhase(), 'ACTIVE_HOLD');
    assert.equal(completed, 0);

    // 2. Dwell at 1200ms (200ms elapsed, < 400ms target)
    engine.processPoseFrame(generateSyntheticSquatLandmarks(130, 'left', 0.95), 1200, 640, 480);
    assert.equal(completed, 0);

    // 3. Dwell reaches 1450ms (450ms elapsed, >= 400ms dwell requirement)
    engine.processPoseFrame(generateSyntheticSquatLandmarks(130, 'left', 0.95), 1450, 640, 480);
    assert.equal(completed, 1);
    assert.equal(engine.getPhase(), 'RECOVER');
  });

  test('Tracking loss (>500ms gap) resets stance hold without false completion', () => {
    let completed = 0;
    const engine = new DrillEngine(basketballStanceDrill, 'live', {
      onIntervalCompleted: (c) => {
        completed = c;
      },
    });

    // Enter hold at 1000ms
    engine.processPoseFrame(generateSyntheticSquatLandmarks(130, 'left', 0.95), 1000, 640, 480);
    assert.equal(engine.getPhase(), 'ACTIVE_HOLD');

    // Tracking gap: jump 700ms ahead
    engine.processPoseFrame(generateSyntheticSquatLandmarks(130, 'left', 0.95), 1700, 640, 480);

    assert.equal(completed, 0, 'Tracking gap must not award false interval completion');
    assert.equal(engine.getPhase(), 'SETUP');
  });

  test('Confidence below 0.60 records unknown and does not compute joint angle', () => {
    const engine = new DrillEngine(basketballStanceDrill, 'live');

    // Feed frame with low confidence 0.40
    const lowConfLandmarks = generateSyntheticSquatLandmarks(130, 'left', 0.40);
    const obs = engine.processPoseFrame(lowConfLandmarks, 1000, 640, 480);

    assert.equal(obs.angles.knee, null);
    const summary = engine.createSessionSummary();
    assert.ok(summary.unknownItems.some((item) => item.includes('below 0.60')));
  });

  test('Sports drill session earns safe participation XP (30 XP) under existing daily cap', () => {
    let state = { ...INITIAL_PROGRESSION_STATE };
    const dateKey = '2026-10-02';

    const res = applyReward(state, {
      eventId: 'evt_sports_drill_1',
      type: 'slot',
      source: 'live',
      dateKey,
      details: { movement: 'sports_football_lateral_footwork' },
    });

    assert.equal(res.awardedXp, 30);
    assert.equal(res.newState.totalXp, 30);
    assert.equal(res.newState.dailyLedgers[dateKey].slotFlag, true);
  });
});
