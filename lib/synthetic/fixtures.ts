import { NormalizedLandmark, POSE_LANDMARKS } from '../pose/types';

/**
 * Creates a blank 33-landmark array with default coordinates
 */
export function createBlankLandmarks(): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = [];
  for (let i = 0; i < 33; i++) {
    landmarks.push({
      x: 0.5,
      y: 0.5,
      z: 0.0,
      visibility: 0.9,
      presence: 0.9,
    });
  }
  return landmarks;
}

/**
 * Computes coordinate for vertex C given vertex B, vertex A, and desired angle (degrees)
 */
export function computePointAtAngle(
  origin: { x: number; y: number },
  length: number,
  angleRad: number
): { x: number; y: number } {
  return {
    x: origin.x + length * Math.cos(angleRad),
    y: origin.y + length * Math.sin(angleRad),
  };
}

/**
 * Generates synthetic landmarks for a side-view squat with exact knee angle
 */
export function generateSyntheticSquatLandmarks(
  kneeAngleDeg: number,
  side: 'left' | 'right' = 'left',
  confidence: number = 0.95,
  width: number = 640,
  height: number = 480
): NormalizedLandmark[] {
  const lms = createBlankLandmarks();
  const hipIdx = side === 'left' ? POSE_LANDMARKS.LEFT_HIP : POSE_LANDMARKS.RIGHT_HIP;
  const kneeIdx = side === 'left' ? POSE_LANDMARKS.LEFT_KNEE : POSE_LANDMARKS.RIGHT_KNEE;
  const ankleIdx = side === 'left' ? POSE_LANDMARKS.LEFT_ANKLE : POSE_LANDMARKS.RIGHT_ANKLE;

  // Knee at center-bottom in pixel space
  const kneePx = { x: width * 0.5, y: height * 0.65 };
  // Hip above and slightly back
  const hipPx = { x: width * 0.45, y: height * 0.35 };

  // Vector Knee -> Hip (BA)
  const ba = { x: hipPx.x - kneePx.x, y: hipPx.y - kneePx.y };
  const angleBA = Math.atan2(ba.y, ba.x);

  // Angle between BA and BC = kneeAngleDeg
  // In side view, ankle is downwards/forwards relative to knee
  const angleBC = angleBA - (kneeAngleDeg * Math.PI) / 180;
  const segmentLength = height * 0.3; // 144px

  const anklePx = {
    x: kneePx.x + segmentLength * Math.cos(angleBC),
    y: kneePx.y + segmentLength * Math.sin(angleBC),
  };

  lms[hipIdx] = { x: hipPx.x / width, y: hipPx.y / height, z: 0, visibility: confidence, presence: confidence };
  lms[kneeIdx] = { x: kneePx.x / width, y: kneePx.y / height, z: 0, visibility: confidence, presence: confidence };
  lms[ankleIdx] = { x: anklePx.x / width, y: anklePx.y / height, z: 0, visibility: confidence, presence: confidence };

  return lms;
}

/**
 * Generates synthetic sequence for N complete clean squats
 */
export function createSyntheticSquatSequence(
  numReps: number = 3,
  cycleDurationMs: number = 2400
): { landmarks: NormalizedLandmark[]; timestampMs: number }[] {
  const frames: { landmarks: NormalizedLandmark[]; timestampMs: number }[] = [];
  const fps = 20; // 50ms per frame
  const frameIntervalMs = 1000 / fps;
  let currentTimestamp = 1000;

  // 1. Initial stable readiness hold (165° for 400ms)
  for (let t = 0; t < 400; t += frameIntervalMs) {
    frames.push({
      landmarks: generateSyntheticSquatLandmarks(165, 'left', 0.95),
      timestampMs: currentTimestamp,
    });
    currentTimestamp += frameIntervalMs;
  }

  // 2. Perform reps
  for (let r = 0; r < numReps; r++) {
    const halfCycleDuration = (cycleDurationMs - 200) / 2; // exclude 200ms flexed dwell

    // Descend: 165° -> 105°
    for (let t = 0; t <= halfCycleDuration; t += frameIntervalMs) {
      const progress = t / halfCycleDuration;
      const angle = 165 - progress * (165 - 105);
      frames.push({
        landmarks: generateSyntheticSquatLandmarks(angle, 'left', 0.95),
        timestampMs: currentTimestamp,
      });
      currentTimestamp += frameIntervalMs;
    }

    // Flexed Dwell: hold at 105° for 200ms (satisfies 150ms dwell requirement)
    for (let t = 0; t < 200; t += frameIntervalMs) {
      frames.push({
        landmarks: generateSyntheticSquatLandmarks(105, 'left', 0.95),
        timestampMs: currentTimestamp,
      });
      currentTimestamp += frameIntervalMs;
    }

    // Ascend: 105° -> 165°
    for (let t = 0; t <= halfCycleDuration; t += frameIntervalMs) {
      const progress = t / halfCycleDuration;
      const angle = 105 + progress * (165 - 105);
      frames.push({
        landmarks: generateSyntheticSquatLandmarks(angle, 'left', 0.95),
        timestampMs: currentTimestamp,
      });
      currentTimestamp += frameIntervalMs;
    }

    // Stand / return hold (200ms)
    for (let t = 0; t < 200; t += frameIntervalMs) {
      frames.push({
        landmarks: generateSyntheticSquatLandmarks(165, 'left', 0.95),
        timestampMs: currentTimestamp,
      });
      currentTimestamp += frameIntervalMs;
    }
  }

  return frames;
}

/**
 * Generates synthetic sequence with a partial cycle (descends to 135°, reverses before 110°)
 */
export function createSyntheticPartialSquatSequence(): {
  landmarks: NormalizedLandmark[];
  timestampMs: number;
}[] {
  const frames: { landmarks: NormalizedLandmark[]; timestampMs: number }[] = [];
  let currentTimestamp = 1000;
  const frameIntervalMs = 50;

  // Calibrate readiness
  for (let t = 0; t < 400; t += frameIntervalMs) {
    frames.push({
      landmarks: generateSyntheticSquatLandmarks(165, 'left', 0.95),
      timestampMs: currentTimestamp,
    });
    currentTimestamp += frameIntervalMs;
  }

  // Descend only to 135° (variant flexed threshold is 110°)
  for (let angle = 165; angle >= 135; angle -= 3) {
    frames.push({
      landmarks: generateSyntheticSquatLandmarks(angle, 'left', 0.95),
      timestampMs: currentTimestamp,
    });
    currentTimestamp += frameIntervalMs;
  }

  // Immediately ascend back to 165°
  for (let angle = 135; angle <= 165; angle += 3) {
    frames.push({
      landmarks: generateSyntheticSquatLandmarks(angle, 'left', 0.95),
      timestampMs: currentTimestamp,
    });
    currentTimestamp += frameIntervalMs;
  }

  // Hold at 165° for 300ms to allow EMA filter to settle at extension
  for (let t = 0; t < 300; t += frameIntervalMs) {
    frames.push({
      landmarks: generateSyntheticSquatLandmarks(165, 'left', 0.95),
      timestampMs: currentTimestamp,
    });
    currentTimestamp += frameIntervalMs;
  }

  return frames;
}

/**
 * Generates synthetic sequence with a tracking loss gap (>600ms)
 */
export function createSyntheticTrackingLossSequence(): {
  landmarks: NormalizedLandmark[];
  timestampMs: number;
}[] {
  const frames: { landmarks: NormalizedLandmark[]; timestampMs: number }[] = [];
  let currentTimestamp = 1000;
  const frameIntervalMs = 50;

  // Calibrate readiness
  for (let t = 0; t < 400; t += frameIntervalMs) {
    frames.push({
      landmarks: generateSyntheticSquatLandmarks(165, 'left', 0.95),
      timestampMs: currentTimestamp,
    });
    currentTimestamp += frameIntervalMs;
  }

  // Begin descend to 125°
  for (let angle = 165; angle >= 125; angle -= 5) {
    frames.push({
      landmarks: generateSyntheticSquatLandmarks(angle, 'left', 0.95),
      timestampMs: currentTimestamp,
    });
    currentTimestamp += frameIntervalMs;
  }

  // Tracking drops: 700ms gap
  currentTimestamp += 700;

  // Re-appear at 165°
  for (let t = 0; t < 400; t += frameIntervalMs) {
    frames.push({
      landmarks: generateSyntheticSquatLandmarks(165, 'left', 0.95),
      timestampMs: currentTimestamp,
    });
    currentTimestamp += frameIntervalMs;
  }

  return frames;
}
