import { POSE_LANDMARKS } from '../pose/types';
import { calculateAngle2D, toPixelCoordinates, getLandmarkConfidence } from '../pose/geometry';
import { ExerciseDefinition } from './types';

export const SQUAT_DEFINITION: ExerciseDefinition = {
  id: 'squat',
  nameKey: 'exercise.squat.title',
  category: 'camera',
  descriptionKey: 'exercise.squat.desc',
  instructionsKey: 'exercise.squat.instructions',
  disclaimerKey: 'exercise.squat.disclaimer',
  variants: [
    {
      id: 'squat_standard',
      nameKey: 'variant.standard.title',
      descriptionKey: 'variant.standard.desc',
      extendedThresholdDeg: 160,
      extendedExitThresholdDeg: 150,
      flexedThresholdDeg: 110,
      flexedExitThresholdDeg: 120,
      tempoBandSec: [1.8, 5.0],
      reversalToleranceDeg: 4.0,
    },
    {
      id: 'squat_comfortable_range',
      nameKey: 'variant.gentle.title',
      descriptionKey: 'variant.gentle.desc',
      extendedThresholdDeg: 155,
      extendedExitThresholdDeg: 145,
      flexedThresholdDeg: 130,
      flexedExitThresholdDeg: 138,
      tempoBandSec: [1.5, 5.0],
      reversalToleranceDeg: 4.0,
    },
  ],
  requiredJoints: {
    left: [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
    right: [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
  },
  computeAngle(landmarks, side, videoWidth, videoHeight) {
    const hipIdx = side === 'left' ? POSE_LANDMARKS.LEFT_HIP : POSE_LANDMARKS.RIGHT_HIP;
    const kneeIdx = side === 'left' ? POSE_LANDMARKS.LEFT_KNEE : POSE_LANDMARKS.RIGHT_KNEE;
    const ankleIdx = side === 'left' ? POSE_LANDMARKS.LEFT_ANKLE : POSE_LANDMARKS.RIGHT_ANKLE;

    const hip = landmarks[hipIdx];
    const knee = landmarks[kneeIdx];
    const ankle = landmarks[ankleIdx];

    if (!hip || !knee || !ankle) {
      return { angle: null, confidence: 0 };
    }

    const confHip = getLandmarkConfidence(hip);
    const confKnee = getLandmarkConfidence(knee);
    const confAnkle = getLandmarkConfidence(ankle);
    const avgConfidence = (confHip + confKnee + confAnkle) / 3;

    if (avgConfidence < 0.5) {
      return { angle: null, confidence: avgConfidence };
    }

    const hipPx = toPixelCoordinates(hip, videoWidth, videoHeight);
    const kneePx = toPixelCoordinates(knee, videoWidth, videoHeight);
    const anklePx = toPixelCoordinates(ankle, videoWidth, videoHeight);

    // Angle at Knee vertex B (A: Hip, B: Knee, C: Ankle)
    const angle = calculateAngle2D(hipPx, kneePx, anklePx);
    return {
      angle,
      confidence: avgConfidence,
    };
  },
};
