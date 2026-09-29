import { ExerciseDefinition } from './types';

export const SEATED_GUIDED_DEFINITION: ExerciseDefinition = {
  id: 'seated_guided',
  nameKey: 'exercise.seated.title',
  category: 'guided',
  descriptionKey: 'exercise.seated.desc',
  instructionsKey: 'exercise.seated.instructions',
  disclaimerKey: 'exercise.guided.disclaimer',
  variants: [
    {
      id: 'seated_mobility',
      nameKey: 'variant.seated_flow.title',
      descriptionKey: 'variant.seated_flow.desc',
      extendedThresholdDeg: 0,
      extendedExitThresholdDeg: 0,
      flexedThresholdDeg: 0,
      flexedExitThresholdDeg: 0,
      tempoBandSec: [10, 60],
      reversalToleranceDeg: 0,
    },
  ],
  requiredJoints: { left: [], right: [] },
  computeAngle() {
    return { angle: null, confidence: 1.0 };
  },
};

export const RECOVERY_CHECKIN_DEFINITION: ExerciseDefinition = {
  id: 'recovery_checkin',
  nameKey: 'exercise.recovery.title',
  category: 'guided',
  descriptionKey: 'exercise.recovery.desc',
  instructionsKey: 'exercise.recovery.instructions',
  disclaimerKey: 'exercise.guided.disclaimer',
  variants: [
    {
      id: 'recovery_mindful',
      nameKey: 'variant.recovery_standard.title',
      descriptionKey: 'variant.recovery_standard.desc',
      extendedThresholdDeg: 0,
      extendedExitThresholdDeg: 0,
      flexedThresholdDeg: 0,
      flexedExitThresholdDeg: 0,
      tempoBandSec: [15, 120],
      reversalToleranceDeg: 0,
    },
  ],
  requiredJoints: { left: [], right: [] },
  computeAngle() {
    return { angle: null, confidence: 1.0 };
  },
};
