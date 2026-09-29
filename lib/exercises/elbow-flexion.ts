import { POSE_LANDMARKS } from '../pose/types';
import { calculateAngle2D, toPixelCoordinates, getLandmarkConfidence } from '../pose/geometry';
import { ExerciseDefinition } from './types';

export const ELBOW_FLEXION_DEFINITION: ExerciseDefinition = {
  id: 'elbow_flexion',
  nameKey: 'exercise.elbow.title',
  category: 'camera',
  descriptionKey: 'exercise.elbow.desc',
  instructionsKey: 'exercise.elbow.instructions',
  disclaimerKey: 'exercise.elbow.disclaimer',
  variants: [
    {
      id: 'elbow_standard',
      nameKey: 'variant.standard.title',
      descriptionKey: 'variant.elbow_standard.desc',
      extendedThresholdDeg: 150,
      extendedExitThresholdDeg: 140,
      flexedThresholdDeg: 70,
      flexedExitThresholdDeg: 80,
      tempoBandSec: [1.2, 4.5],
      reversalToleranceDeg: 3.5,
    },
    {
      id: 'elbow_comfortable_range',
      nameKey: 'variant.gentle.title',
      descriptionKey: 'variant.elbow_gentle.desc',
      extendedThresholdDeg: 140,
      extendedExitThresholdDeg: 130,
      flexedThresholdDeg: 90,
      flexedExitThresholdDeg: 98,
      tempoBandSec: [1.0, 4.0],
      reversalToleranceDeg: 3.5,
    },
  ],
  requiredJoints: {
    left: [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
    right: [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
  },
  computeAngle(landmarks, side, videoWidth, videoHeight) {
    const shoulderIdx = side === 'left' ? POSE_LANDMARKS.LEFT_SHOULDER : POSE_LANDMARKS.RIGHT_SHOULDER;
    const elbowIdx = side === 'left' ? POSE_LANDMARKS.LEFT_ELBOW : POSE_LANDMARKS.RIGHT_ELBOW;
    const wristIdx = side === 'left' ? POSE_LANDMARKS.LEFT_WRIST : POSE_LANDMARKS.RIGHT_WRIST;

    const shoulder = landmarks[shoulderIdx];
    const elbow = landmarks[elbowIdx];
    const wrist = landmarks[wristIdx];

    if (!shoulder || !elbow || !wrist) {
      return { angle: null, confidence: 0 };
    }

    const confShoulder = getLandmarkConfidence(shoulder);
    const confElbow = getLandmarkConfidence(elbow);
    const confWrist = getLandmarkConfidence(wrist);
    const avgConfidence = (confShoulder + confElbow + confWrist) / 3;

    if (avgConfidence < 0.5) {
      return { angle: null, confidence: avgConfidence };
    }

    const shoulderPx = toPixelCoordinates(shoulder, videoWidth, videoHeight);
    const elbowPx = toPixelCoordinates(elbow, videoWidth, videoHeight);
    const wristPx = toPixelCoordinates(wrist, videoWidth, videoHeight);

    // Angle at Elbow vertex B (A: Shoulder, B: Elbow, C: Wrist)
    const angle = calculateAngle2D(shoulderPx, elbowPx, wristPx);
    return {
      angle,
      confidence: avgConfidence,
    };
  },
};
