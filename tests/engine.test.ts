import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DeterministicRepEngine } from '../lib/exercises/engine';
import { SQUAT_DEFINITION } from '../lib/exercises/squat';
import { calculateAngle2D } from '../lib/pose/geometry';
import {
  createSyntheticSquatSequence,
  createSyntheticPartialSquatSequence,
  createSyntheticTrackingLossSequence,
  generateSyntheticSquatLandmarks,
} from '../lib/synthetic/fixtures';

describe('DeterministicRepEngine Pure Unit Tests', () => {
  test('Complete 3-rep squat sequence counts exactly 3 reps with valid Q scores', () => {
    let repsCounted = 0;
    const engine = new DeterministicRepEngine(
      {
        definition: SQUAT_DEFINITION,
        variant: SQUAT_DEFINITION.variants[0],
        source: 'live',
        preferredSide: 'left',
      },
      {
        onRepCompleted: () => {
          repsCounted++;
        },
      }
    );

    const sequence = createSyntheticSquatSequence(3, 2400);
    for (const frame of sequence) {
      engine.processFrame(frame.landmarks, frame.timestampMs, 640, 480);
    }

    assert.equal(engine.getRepsCount(), 3);
    assert.equal(repsCounted, 3);

    const completed = engine.getCompletedReps();
    assert.equal(completed.length, 3);

    for (const rep of completed) {
      assert.ok(rep.durationSec >= 0.8, 'Duration must be at least 0.8s');
      assert.ok(rep.metrics.qScore !== null, 'Q score must be computed for valid rep');
      assert.ok(rep.metrics.qScore >= 50 && rep.metrics.qScore <= 100, 'Q score must be between 50 and 100');
      assert.ok(rep.metrics.coveragePercent >= 80, 'Coverage must be >= 80%');
    }

    const summary = engine.createSessionSummary();
    assert.equal(summary.totalRepsCompleted, 3);
    assert.equal(summary.scoredRepsCount, 3);
    assert.equal(summary.isPreliminary, false); // 3 reps => not preliminary
    assert.ok(summary.medianQScore !== null);
  });

  test('Partial squat cycle (stopping above flexion threshold) does NOT count', () => {
    const engine = new DeterministicRepEngine({
      definition: SQUAT_DEFINITION,
      variant: SQUAT_DEFINITION.variants[0],
      source: 'live',
      preferredSide: 'left',
    });

    const sequence = createSyntheticPartialSquatSequence();
    for (const frame of sequence) {
      engine.processFrame(frame.landmarks, frame.timestampMs, 640, 480);
    }

    assert.equal(engine.getRepsCount(), 0, 'Partial rep must not be counted');
    assert.equal(engine.getPhase(), 'READY');
  });

  test('Tracking loss (>500ms gap) clears incomplete cycle and resets state', () => {
    const engine = new DeterministicRepEngine({
      definition: SQUAT_DEFINITION,
      variant: SQUAT_DEFINITION.variants[0],
      source: 'live',
      preferredSide: 'left',
    });

    const sequence = createSyntheticTrackingLossSequence();
    for (const frame of sequence) {
      engine.processFrame(frame.landmarks, frame.timestampMs, 640, 480);
    }

    assert.equal(engine.getRepsCount(), 0, 'Rep broken by tracking loss must not be counted');
    const summary = engine.createSessionSummary();
    assert.ok(summary.observedCueIds.includes('TRACKING_LOST'));
  });

  test('Zero-length vector handling in calculateAngle2D returns null safely without NaN', () => {
    const p1 = { x: 100, y: 100 };
    const p2 = { x: 100, y: 100 }; // duplicate vertex
    const p3 = { x: 200, y: 200 };

    const angle = calculateAngle2D(p1, p2, p3);
    assert.equal(angle, null);
  });

  test('Low landmark confidence triggers cue and skips corrupt angle calculation', () => {
    let cueTriggered = false;
    const engine = new DeterministicRepEngine(
      {
        definition: SQUAT_DEFINITION,
        variant: SQUAT_DEFINITION.variants[0],
        source: 'live',
        preferredSide: 'left',
      },
      {
        onCue: (cue) => {
          if (cue === 'MOVE_INTO_VIEW') cueTriggered = true;
        },
      }
    );

    // Frame with 0.2 confidence (below 0.5 threshold)
    const lowConfLandmarks = generateSyntheticSquatLandmarks(165, 'left', 0.2);
    const res = engine.processFrame(lowConfLandmarks, 1000, 640, 480);

    assert.equal(res.currentAngle, null);
    assert.equal(cueTriggered, true);
  });

  test('Pause and resume properly clears partial cycle without phantom reps', () => {
    const engine = new DeterministicRepEngine({
      definition: SQUAT_DEFINITION,
      variant: SQUAT_DEFINITION.variants[0],
      source: 'live',
      preferredSide: 'left',
    });

    // Feed readiness
    engine.processFrame(generateSyntheticSquatLandmarks(165, 'left', 0.95), 1000, 640, 480);
    engine.processFrame(generateSyntheticSquatLandmarks(165, 'left', 0.95), 1400, 640, 480);
    assert.equal(engine.getPhase(), 'READY');

    // Begin descending (feed frames so EMA filter crosses below 150 exit threshold)
    engine.processFrame(generateSyntheticSquatLandmarks(140, 'left', 0.95), 1500, 640, 480);
    engine.processFrame(generateSyntheticSquatLandmarks(140, 'left', 0.95), 1550, 640, 480);
    engine.processFrame(generateSyntheticSquatLandmarks(140, 'left', 0.95), 1600, 640, 480);
    assert.equal(engine.getPhase(), 'DESCENDING');

    // User hits Pause
    engine.pause();
    assert.equal(engine.isTrackingPaused(), true);

    // Frames while paused
    engine.processFrame(generateSyntheticSquatLandmarks(105, 'left', 0.95), 1800, 640, 480);

    // Resume
    engine.resume(2500);
    assert.equal(engine.isTrackingPaused(), false);
    assert.equal(engine.getPhase(), 'IDLE');
    assert.equal(engine.getRepsCount(), 0);
  });
});
