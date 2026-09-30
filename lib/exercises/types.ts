import { NormalizedLandmark, Point2D, TrackedSide } from '../pose/types';

export type MovementType = 'squat' | 'elbow_flexion' | 'seated_guided' | 'recovery_checkin';

export type MovementSource = 'live' | 'guided' | 'demo';

export type RepPhase = 'IDLE' | 'READY' | 'DESCENDING' | 'FLEXED' | 'ASCENDING';

export type CueId =
  | 'MOVE_INTO_VIEW'
  | 'USE_COMFORTABLE_RANGE'
  | 'MOVE_AT_YOUR_OWN_PACE'
  | 'TRACKING_PAUSED'
  | 'SESSION_SAVED'
  | 'READY_HOLD_STILL'
  | 'SMOOTH_MOVEMENT'
  | 'REP_COUNTED'
  | 'TRACKING_LOST'
  | 'CALIBRATION_COMPLETE'
  | 'DISCOMFORT_REPORTED'
  | 'REST_DAY_RECORDED';

export interface AngleSample {
  timestampMs: number;
  angle: number;
  valid: boolean;
}

export interface RepMetrics {
  coveragePercent: number; // [0, 100]
  rangeExcursionDeg: number;
  targetExcursionDeg: number;
  durationSec: number;
  directionReversals: number;
  rScore: number; // [0, 1]
  tScore: number; // [0, 1]
  sScore: number; // [0, 1]
  qScore: number | null; // null if coverage < 80% or invalid
}

export interface RepEvent {
  repNumber: number;
  startTimeMs: number;
  endTimeMs: number;
  durationSec: number;
  minAngle: number;
  maxAngle: number;
  metrics: RepMetrics;
  side: 'left' | 'right';
}

export interface ExerciseVariant {
  id: string;
  nameKey: string;
  descriptionKey: string;
  extendedThresholdDeg: number;
  extendedExitThresholdDeg: number;
  flexedThresholdDeg: number;
  flexedExitThresholdDeg: number;
  tempoBandSec: [number, number]; // [min, max]
  reversalToleranceDeg: number;
}

export interface ExerciseDefinition {
  id: MovementType;
  nameKey: string;
  category: 'camera' | 'guided';
  descriptionKey: string;
  instructionsKey: string;
  guidedInstructionsKey?: string;
  disclaimerKey: string;
  variants: ExerciseVariant[];
  requiredJoints: {
    left: number[];
    right: number[];
  };
  computeAngle(
    landmarks: NormalizedLandmark[],
    side: 'left' | 'right',
    videoWidth: number,
    videoHeight: number
  ): { angle: number | null; confidence: number };
}

export type SessionLifecycleState = 'preview' | 'active' | 'paused' | 'completed' | 'saved';

export interface SessionSummary {
  id: string;
  movement: MovementType;
  variantId: string;
  source: MovementSource;
  startedAt: string; // ISO
  endedAt: string;   // ISO
  totalActiveTimeSec: number;
  totalValidTrackingTimeSec: number;
  overallCoveragePercent: number | null; // null for guided/no-camera
  totalRepsCompleted: number;
  scoredRepsCount: number;
  medianQScore: number | null;
  isPreliminary: boolean;
  repDetails: RepEvent[];
  observedCueIds: CueId[];
  userReflection?: string;
  selfReportedEffort?: 'comfortable' | 'moderate' | 'challenging' | 'restorative';
  evidenceSummary?: string;
}
