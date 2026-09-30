import { SessionSummary } from '../exercises/types';

export interface SanitizedCoachPayload {
  exerciseId: string;
  locale: 'en' | 'hi';
  repsCompleted: number;
  scoredReps: number;
  coveragePercent: number | null;
  medianQScore: number | null;
  observedCueIds: string[];
  userReflection?: string;
}

/**
 * Strict privacy sanitizer before sending minimal summary to coach.
 * Strips all timestamps, coordinates, device IDs, personal identifiers.
 */
export function sanitizeSessionForCloudCoach(
  session: SessionSummary,
  locale: 'en' | 'hi'
): SanitizedCoachPayload {
  return {
    exerciseId: session.movement,
    locale,
    repsCompleted: session.totalRepsCompleted,
    scoredReps: session.scoredRepsCount,
    coveragePercent: session.overallCoveragePercent,
    medianQScore: session.medianQScore,
    observedCueIds: session.observedCueIds,
    userReflection: session.userReflection ? session.userReflection.slice(0, 200) : undefined,
  };
}
