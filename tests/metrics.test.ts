import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCoverage,
  calculateRangeScore,
  calculateTempoScore,
  countUnexpectedReversals,
  calculateSmoothnessScore,
  calculateRepQScore,
  calculateSessionMedianQ,
  calculateConsistencyScore,
  calculateMobilityPracticeScore,
} from '../lib/scoring/metrics';

describe('Scoring Metrics Pure Functions', () => {
  test('Coverage calculation clamps and handles edge cases', () => {
    assert.equal(calculateCoverage(0, 0), 0);
    assert.equal(calculateCoverage(1000, 2000), 50.0);
    assert.equal(calculateCoverage(2500, 2000), 100.0); // clamped at 100
  });

  test('Range score R = min(1, observed / target)', () => {
    assert.equal(calculateRangeScore(50, 50), 1.0);
    assert.equal(calculateRangeScore(25, 50), 0.5);
    assert.equal(calculateRangeScore(60, 50), 1.0);
    assert.equal(calculateRangeScore(50, 0), 0.0);
  });

  test('Tempo score T within [a, b] is 1.0, falls off smoothly outside', () => {
    const band: [number, number] = [2.0, 4.0];
    assert.equal(calculateTempoScore(2.5, band), 1.0);
    assert.equal(calculateTempoScore(3.0, band), 1.0);
    assert.equal(calculateTempoScore(4.0, band), 1.0);

    // Below: distance = 2.0 - 1.0 = 1.0 => 1 - 1.0 / 4.0 = 0.75
    assert.equal(calculateTempoScore(1.0, band), 0.75);

    // Above: distance = 5.0 - 4.0 = 1.0 => 1 - 1.0 / 4.0 = 0.75
    assert.equal(calculateTempoScore(5.0, band), 0.75);
  });

  test('Smoothness S accounts for unexpected reversals beyond standard turnaround', () => {
    // Normal rep trajectory: 165 -> 140 -> 110 -> 140 -> 165 (1 normal reversal)
    const smoothSamples = [
      { timestampMs: 1000, angle: 165, valid: true },
      { timestampMs: 1500, angle: 140, valid: true },
      { timestampMs: 2000, angle: 110, valid: true },
      { timestampMs: 2500, angle: 140, valid: true },
      { timestampMs: 3000, angle: 165, valid: true },
    ];
    const reversals = countUnexpectedReversals(smoothSamples, 3.5);
    assert.equal(reversals, 0);
    assert.equal(calculateSmoothnessScore(reversals), 1.0);

    // Shaky rep trajectory: multiple reversals
    const shakySamples = [
      { timestampMs: 1000, angle: 165, valid: true },
      { timestampMs: 1200, angle: 140, valid: true },
      { timestampMs: 1400, angle: 150, valid: true }, // bounce 1
      { timestampMs: 1600, angle: 130, valid: true }, // resume descend
      { timestampMs: 1800, angle: 110, valid: true }, // peak flexion
      { timestampMs: 2000, angle: 130, valid: true },
      { timestampMs: 2200, angle: 120, valid: true }, // bounce 2
      { timestampMs: 2400, angle: 165, valid: true },
    ];
    const shakyReversals = countUnexpectedReversals(shakySamples, 3.5);
    assert.ok(shakyReversals >= 2);
    assert.ok(calculateSmoothnessScore(shakyReversals) < 1.0);
  });

  test('Rep Q Score formula: 45% R + 35% T + 20% S, returns null if coverage < 80%', () => {
    // Perfect rep: R=1, T=1, S=1 => 100
    assert.equal(calculateRepQScore(1.0, 1.0, 1.0, 95.0), 100);

    // Mixed scores
    // 0.45*0.8 + 0.35*1.0 + 0.20*0.75 = 0.36 + 0.35 + 0.15 = 0.86 => 86
    assert.equal(calculateRepQScore(0.8, 1.0, 0.75, 85.0), 86);

    // Coverage < 80% => must be null
    assert.equal(calculateRepQScore(1.0, 1.0, 1.0, 79.9), null);
  });

  test('Session median Q correctly calculates median and flags preliminary (< 3)', () => {
    // 1 rep => preliminary
    const res1 = calculateSessionMedianQ([85]);
    assert.equal(res1.medianQ, 85);
    assert.equal(res1.scoredCount, 1);
    assert.equal(res1.isPreliminary, true);

    // 2 reps => preliminary
    const res2 = calculateSessionMedianQ([80, 90]);
    assert.equal(res2.medianQ, 85);
    assert.equal(res2.isPreliminary, true);

    // 3 reps => not preliminary
    const res3 = calculateSessionMedianQ([75, 85, 95]);
    assert.equal(res3.medianQ, 85);
    assert.equal(res3.isPreliminary, false);

    // Null list => null
    const resEmpty = calculateSessionMedianQ([null, null]);
    assert.equal(resEmpty.medianQ, null);
    assert.equal(resEmpty.scoredCount, 0);
  });

  test('Consistency and mobility scores handle 0 planned denominators gracefully', () => {
    const consistencyNull = calculateConsistencyScore(0, 0);
    assert.equal(consistencyNull.score, null);

    const consistencyValid = calculateConsistencyScore(4, 5);
    assert.equal(consistencyValid.score, 80);

    const mobilityNull = calculateMobilityPracticeScore(0, 0);
    assert.equal(mobilityNull.score, null);

    const mobilityValid = calculateMobilityPracticeScore(3, 3);
    assert.equal(mobilityValid.score, 100);
  });
});
