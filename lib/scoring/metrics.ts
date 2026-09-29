import { AngleSample } from '../exercises/types';

/**
 * Pure scoring functions for Kinetra
 */

/**
 * Coverage = (valid observation time / active observation time) * 100
 */
export function calculateCoverage(validTimeMs: number, activeTimeMs: number): number {
  if (activeTimeMs <= 0) return 0;
  const ratio = validTimeMs / activeTimeMs;
  return Math.min(100, Math.max(0, Math.round(ratio * 1000) / 10));
}

/**
 * R = min(1, observed angle excursion / selected comfortable-profile excursion)
 */
export function calculateRangeScore(observedExcursionDeg: number, targetExcursionDeg: number): number {
  if (targetExcursionDeg <= 0) return 0;
  const r = observedExcursionDeg / targetExcursionDeg;
  return Math.min(1, Math.max(0, Math.round(r * 1000) / 1000));
}

/**
 * T = 1 inside configured practice duration band [a, b],
 * otherwise max(0, 1 - distance(duration, [a, b]) / b)
 */
export function calculateTempoScore(durationSec: number, tempoBand: [number, number]): number {
  const [a, b] = tempoBand;
  if (b <= 0) return 0;

  if (durationSec >= a && durationSec <= b) {
    return 1.0;
  }

  const distance = durationSec < a ? a - durationSec : durationSec - b;
  const score = Math.max(0, 1.0 - distance / b);
  return Math.round(score * 1000) / 1000;
}

/**
 * Count unexpected direction reversals during trajectory, ignoring micro-jitter
 */
export function countUnexpectedReversals(
  samples: AngleSample[],
  reversalToleranceDeg: number = 3.5
): number {
  if (samples.length < 3) return 0;

  // Compute direction changes after passing tolerance
  let direction: 'decreasing' | 'increasing' | null = null;
  let lastAnchor = samples[0].angle;
  let reversals = 0;

  for (let i = 1; i < samples.length; i++) {
    const current = samples[i].angle;
    const diff = current - lastAnchor;

    if (Math.abs(diff) >= reversalToleranceDeg) {
      const currentDir: 'decreasing' | 'increasing' = diff > 0 ? 'increasing' : 'decreasing';
      if (direction !== null && currentDir !== direction) {
        reversals++;
      }
      direction = currentDir;
      lastAnchor = current;
    }
  }

  // A single standard full cycle changes direction once at peak flexion (descend -> ascend).
  // Unexpected reversals are any EXTRA reversals beyond the normal 1 reversal.
  const unexpectedReversals = Math.max(0, reversals - 1);
  return unexpectedReversals;
}

/**
 * S = max(0, 1 - unexpected filtered direction reversals / 4)
 */
export function calculateSmoothnessScore(unexpectedReversals: number): number {
  const score = Math.max(0, 1.0 - unexpectedReversals / 4.0);
  return Math.round(score * 1000) / 1000;
}

/**
 * Q = round(100 * (0.45 * R + 0.35 * T + 0.20 * S))
 * Returns null if coverage < 80%
 */
export function calculateRepQScore(
  r: number,
  t: number,
  s: number,
  coveragePercent: number
): number | null {
  if (coveragePercent < 80.0) {
    return null;
  }
  const weighted = 0.45 * r + 0.35 * t + 0.20 * s;
  return Math.round(100 * weighted);
}

/**
 * Session technique is the median eligible Q; < 3 eligible cycles is preliminary.
 */
export function calculateSessionMedianQ(repQScores: (number | null)[]): {
  medianQ: number | null;
  scoredCount: number;
  isPreliminary: boolean;
} {
  const eligible = repQScores.filter((s): s is number => s !== null);
  const scoredCount = eligible.length;

  if (scoredCount === 0) {
    return {
      medianQ: null,
      scoredCount: 0,
      isPreliminary: false,
    };
  }

  const sorted = [...eligible].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  let medianQ: number;

  if (sorted.length % 2 !== 0) {
    medianQ = sorted[mid];
  } else {
    medianQ = Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }

  return {
    medianQ,
    scoredCount,
    isPreliminary: scoredCount < 3,
  };
}

/**
 * Consistency = 100 * fulfilled elapsed planned slots / elapsed planned slots
 * Returns null if elapsed planned slots <= 0
 */
export function calculateConsistencyScore(
  fulfilledSlots: number,
  elapsedPlannedSlots: number
): { score: number | null; fulfilled: number; total: number } {
  if (elapsedPlannedSlots <= 0) {
    return { score: null, fulfilled: fulfilledSlots, total: elapsedPlannedSlots };
  }
  const ratio = (fulfilledSlots / elapsedPlannedSlots) * 100;
  return {
    score: Math.min(100, Math.max(0, Math.round(ratio))),
    fulfilled: fulfilledSlots,
    total: elapsedPlannedSlots,
  };
}

/**
 * Mobility practice = 100 * min(1, completed planned comfortable-mobility tasks / planned tasks)
 * Returns null if planned tasks <= 0
 */
export function calculateMobilityPracticeScore(
  completedTasks: number,
  plannedTasks: number
): { score: number | null; completed: number; total: number } {
  if (plannedTasks <= 0) {
    return { score: null, completed: completedTasks, total: plannedTasks };
  }
  const ratio = Math.min(1.0, completedTasks / plannedTasks) * 100;
  return {
    score: Math.min(100, Math.max(0, Math.round(ratio))),
    completed: completedTasks,
    total: plannedTasks,
  };
}
