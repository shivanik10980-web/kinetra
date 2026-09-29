import { NormalizedLandmark, TrackedSide } from '../pose/types';
import { EmaAngleFilter } from '../pose/smoothing';
import { selectMoreVisibleSide } from '../pose/geometry';
import {
  AngleSample,
  CueId,
  ExerciseDefinition,
  ExerciseVariant,
  RepEvent,
  RepPhase,
  SessionSummary,
  MovementSource,
} from './types';
import {
  calculateCoverage,
  calculateRangeScore,
  calculateTempoScore,
  countUnexpectedReversals,
  calculateSmoothnessScore,
  calculateRepQScore,
  calculateSessionMedianQ,
} from '../scoring/metrics';

export interface RepEngineConfig {
  definition: ExerciseDefinition;
  variant: ExerciseVariant;
  source: MovementSource;
  preferredSide?: TrackedSide;
  cueCooldownMs?: number; // default 4000ms
}

export interface EngineCallbacks {
  onPhaseChange?: (phase: RepPhase) => void;
  onRepCompleted?: (event: RepEvent) => void;
  onCue?: (cue: CueId) => void;
  onCoverageUpdate?: (coveragePercent: number) => void;
}

export class DeterministicRepEngine {
  private definition: ExerciseDefinition;
  private variant: ExerciseVariant;
  private source: MovementSource;
  private preferredSide: TrackedSide;
  private lockedSide: 'left' | 'right' | null = null;
  private callbacks: EngineCallbacks;

  // Smoothing
  private angleFilter: EmaAngleFilter;

  // State Machine
  private phase: RepPhase = 'IDLE';
  private isPaused: boolean = false;
  private isCalibrated: boolean = false;

  // Timing
  private sessionStartTimeMs: number = 0;
  private activeObservationTimeMs: number = 0;
  private validObservationTimeMs: number = 0;
  private lastProcessedTimestampMs: number = 0;
  private lastPauseTimestampMs: number = 0;

  // Phase transition timestamps & dwell
  private readyHoldStartTimeMs: number = 0;
  private flexedDwellStartTimeMs: number = 0;
  private cycleStartTimeMs: number = 0;
  private cycleValidTimeMs: number = 0;

  // Trajectory samples for current rep
  private currentCycleSamples: AngleSample[] = [];

  // Completed reps
  private completedReps: RepEvent[] = [];
  private observedCues: Set<CueId> = new Set();
  private lastCueTimeMs: number = -10000;
  private cueCooldownMs: number = 4000;

  constructor(config: RepEngineConfig, callbacks: EngineCallbacks = {}) {
    this.definition = config.definition;
    this.variant = config.variant;
    this.source = config.source;
    this.preferredSide = config.preferredSide || 'auto';
    this.callbacks = callbacks;
    this.cueCooldownMs = config.cueCooldownMs || 4000;
    this.angleFilter = new EmaAngleFilter({ alpha: 0.35, confidenceThreshold: 0.55, maxGapMs: 500 });
  }

  public getPhase(): RepPhase {
    return this.phase;
  }

  public getRepsCount(): number {
    return this.completedReps.length;
  }

  public getCompletedReps(): RepEvent[] {
    return [...this.completedReps];
  }

  public getLockedSide(): 'left' | 'right' | null {
    return this.lockedSide;
  }

  public isTrackingPaused(): boolean {
    return this.isPaused;
  }

  private triggerCue(cueId: CueId, nowMs: number): void {
    this.observedCues.add(cueId);
    if (nowMs - this.lastCueTimeMs >= this.cueCooldownMs) {
      this.lastCueTimeMs = nowMs;
      this.callbacks.onCue?.(cueId);
    }
  }

  private setPhase(newPhase: RepPhase): void {
    if (this.phase !== newPhase) {
      this.phase = newPhase;
      this.callbacks.onPhaseChange?.(newPhase);
    }
  }

  public processFrame(
    landmarks: NormalizedLandmark[],
    timestampMs: number,
    videoWidth: number,
    videoHeight: number
  ): {
    currentAngle: number | null;
    phase: RepPhase;
    coveragePercent: number;
    repsCount: number;
  } {
    if (this.isPaused) {
      return {
        currentAngle: null,
        phase: this.phase,
        coveragePercent: this.getOverallCoverage(),
        repsCount: this.completedReps.length,
      };
    }

    if (this.sessionStartTimeMs === 0) {
      this.sessionStartTimeMs = timestampMs;
    }

    // Delta time calculation
    const deltaMs = this.lastProcessedTimestampMs > 0 ? Math.max(0, timestampMs - this.lastProcessedTimestampMs) : 0;
    this.lastProcessedTimestampMs = timestampMs;
    this.activeObservationTimeMs += deltaMs;

    // Check gap > 500ms -> clear incomplete rep and reset state
    if (deltaMs > 500) {
      this.resetIncompleteCycle();
      this.angleFilter.reset();
      this.triggerCue('TRACKING_LOST', timestampMs);
    }

    // Determine side if not locked
    if (!this.lockedSide) {
      if (this.preferredSide === 'left' || this.preferredSide === 'right') {
        this.lockedSide = this.preferredSide;
      } else {
        this.lockedSide = selectMoreVisibleSide(
          landmarks,
          this.definition.requiredJoints.left,
          this.definition.requiredJoints.right
        );
      }
    }

    // Compute joint angle
    const { angle: rawAngle, confidence } = this.definition.computeAngle(
      landmarks,
      this.lockedSide,
      videoWidth,
      videoHeight
    );

    // Visibility / Confidence check
    if (rawAngle === null || confidence < 0.5) {
      this.triggerCue('MOVE_INTO_VIEW', timestampMs);
      return {
        currentAngle: null,
        phase: this.phase,
        coveragePercent: this.getOverallCoverage(),
        repsCount: this.completedReps.length,
      };
    }

    // Landmark is valid
    this.validObservationTimeMs += deltaMs;
    const smoothedAngle = this.angleFilter.update(rawAngle, timestampMs, confidence);

    if (smoothedAngle === null) {
      return {
        currentAngle: null,
        phase: this.phase,
        coveragePercent: this.getOverallCoverage(),
        repsCount: this.completedReps.length,
      };
    }

    // Record sample if within cycle
    if (this.phase !== 'IDLE' && this.phase !== 'READY') {
      this.cycleValidTimeMs += deltaMs;
      this.currentCycleSamples.push({
        timestampMs,
        angle: smoothedAngle,
        valid: true,
      });
    }

    // Run Finite State Machine (READY -> DESCENDING -> FLEXED -> ASCENDING -> READY)
    this.stepStateMachine(smoothedAngle, timestampMs);

    const coverage = this.getOverallCoverage();
    this.callbacks.onCoverageUpdate?.(coverage);

    return {
      currentAngle: Math.round(smoothedAngle * 10) / 10,
      phase: this.phase,
      coveragePercent: coverage,
      repsCount: this.completedReps.length,
    };
  }

  private stepStateMachine(angle: number, nowMs: number): void {
    const {
      extendedThresholdDeg,
      extendedExitThresholdDeg,
      flexedThresholdDeg,
      flexedExitThresholdDeg,
    } = this.variant;

    switch (this.phase) {
      case 'IDLE': {
        // Must hold at or above extended threshold for 300ms to establish readiness
        if (angle >= extendedThresholdDeg) {
          if (this.readyHoldStartTimeMs === 0) {
            this.readyHoldStartTimeMs = nowMs;
          } else if (nowMs - this.readyHoldStartTimeMs >= 300) {
            this.setPhase('READY');
            this.isCalibrated = true;
            this.triggerCue('READY_HOLD_STILL', nowMs);
          }
        } else {
          this.readyHoldStartTimeMs = 0;
        }
        break;
      }

      case 'READY': {
        // Check if movement begins into flexion (dropping below exit threshold)
        if (angle < extendedExitThresholdDeg) {
          this.setPhase('DESCENDING');
          this.cycleStartTimeMs = nowMs;
          this.cycleValidTimeMs = 0;
          this.currentCycleSamples = [{ timestampMs: nowMs, angle, valid: true }];
          this.flexedDwellStartTimeMs = 0;
        }
        break;
      }

      case 'DESCENDING': {
        // Check if reached flexion threshold
        if (angle <= flexedThresholdDeg) {
          this.setPhase('FLEXED');
          this.flexedDwellStartTimeMs = nowMs;
        } else if (angle >= extendedThresholdDeg) {
          // Aborted descend, returned to top without flexing
          this.resetIncompleteCycle();
          this.setPhase('READY');
        }
        break;
      }

      case 'FLEXED': {
        // Must dwell in flexion for at least 150ms
        const dwellDuration = nowMs - this.flexedDwellStartTimeMs;
        if (dwellDuration >= 150) {
          // Check if moving out of flexion past flexed exit threshold
          if (angle > flexedExitThresholdDeg) {
            this.setPhase('ASCENDING');
          }
        }
        break;
      }

      case 'ASCENDING': {
        // Check if returned to extended threshold
        if (angle >= extendedThresholdDeg) {
          // Check cycle duration (>= 800ms)
          const cycleDurationMs = nowMs - this.cycleStartTimeMs;
          if (cycleDurationMs >= 800) {
            this.finalizeRep(nowMs, cycleDurationMs);
          } else {
            // Half-rep or too rapid, discard
            this.resetIncompleteCycle();
          }
          this.setPhase('READY');
          this.readyHoldStartTimeMs = nowMs;
        } else if (angle <= flexedThresholdDeg) {
          // Aborted ascend, returned down
          this.setPhase('FLEXED');
          this.flexedDwellStartTimeMs = nowMs;
        }
        break;
      }
    }
  }

  private finalizeRep(nowMs: number, cycleDurationMs: number): void {
    const durationSec = Math.round((cycleDurationMs / 1000) * 100) / 100;
    const repCoveragePercent = calculateCoverage(this.cycleValidTimeMs, cycleDurationMs);

    // Calculate excursion
    let minAngle = 999;
    let maxAngle = -999;
    for (const sample of this.currentCycleSamples) {
      if (sample.angle < minAngle) minAngle = sample.angle;
      if (sample.angle > maxAngle) maxAngle = sample.angle;
    }
    const observedExcursion = Math.max(0, maxAngle - minAngle);
    const targetExcursion = Math.abs(this.variant.extendedThresholdDeg - this.variant.flexedThresholdDeg);

    // Calculate R, T, S scores
    const rScore = calculateRangeScore(observedExcursion, targetExcursion);
    const tScore = calculateTempoScore(durationSec, this.variant.tempoBandSec);
    const reversals = countUnexpectedReversals(this.currentCycleSamples, this.variant.reversalToleranceDeg);
    const sScore = calculateSmoothnessScore(reversals);

    // Q Score (null if coverage < 80%)
    const qScore = calculateRepQScore(rScore, tScore, sScore, repCoveragePercent);

    const repEvent: RepEvent = {
      repNumber: this.completedReps.length + 1,
      startTimeMs: this.cycleStartTimeMs,
      endTimeMs: nowMs,
      durationSec,
      minAngle: Math.round(minAngle * 10) / 10,
      maxAngle: Math.round(maxAngle * 10) / 10,
      side: this.lockedSide || 'left',
      metrics: {
        coveragePercent: repCoveragePercent,
        rangeExcursionDeg: Math.round(observedExcursion * 10) / 10,
        targetExcursionDeg: targetExcursion,
        durationSec,
        directionReversals: reversals,
        rScore,
        tScore,
        sScore,
        qScore,
      },
    };

    this.completedReps.push(repEvent);
    this.triggerCue('REP_COUNTED', nowMs);
    this.callbacks.onRepCompleted?.(repEvent);

    // Clear cycle state
    this.resetIncompleteCycle();
  }

  public resetIncompleteCycle(): void {
    this.cycleStartTimeMs = 0;
    this.cycleValidTimeMs = 0;
    this.currentCycleSamples = [];
    this.flexedDwellStartTimeMs = 0;
    if (this.phase === 'DESCENDING' || this.phase === 'FLEXED' || this.phase === 'ASCENDING') {
      this.setPhase('READY');
    }
  }

  public pause(): void {
    if (!this.isPaused) {
      this.isPaused = true;
      this.lastPauseTimestampMs = Date.now();
      this.resetIncompleteCycle();
      this.triggerCue('TRACKING_PAUSED', Date.now());
    }
  }

  public resume(timestampMs?: number): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.lastProcessedTimestampMs = timestampMs || Date.now();
      this.angleFilter.reset();
      this.setPhase('IDLE');
      this.readyHoldStartTimeMs = 0;
    }
  }

  public reportDiscomfort(): void {
    this.pause();
    this.triggerCue('DISCOMFORT_REPORTED', Date.now());
  }

  public reset(): void {
    this.phase = 'IDLE';
    this.isPaused = false;
    this.isCalibrated = false;
    this.sessionStartTimeMs = 0;
    this.activeObservationTimeMs = 0;
    this.validObservationTimeMs = 0;
    this.lastProcessedTimestampMs = 0;
    this.readyHoldStartTimeMs = 0;
    this.flexedDwellStartTimeMs = 0;
    this.completedReps = [];
    this.currentCycleSamples = [];
    this.observedCues.clear();
    this.angleFilter.reset();
  }

  public getOverallCoverage(): number {
    return calculateCoverage(this.validObservationTimeMs, this.activeObservationTimeMs);
  }

  public createSessionSummary(options?: {
    reflection?: string;
    effort?: 'comfortable' | 'moderate' | 'challenging' | 'restorative';
  }): SessionSummary {
    const qScores = this.completedReps.map((r) => r.metrics.qScore);
    const { medianQ, scoredCount, isPreliminary } = calculateSessionMedianQ(qScores);

    const nowIso = new Date().toISOString();
    const startedIso = this.sessionStartTimeMs > 0
      ? new Date(Date.now() - (this.activeObservationTimeMs || 1000)).toISOString()
      : nowIso;

    return {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      movement: this.definition.id,
      variantId: this.variant.id,
      source: this.source,
      startedAt: startedIso,
      endedAt: nowIso,
      totalActiveTimeSec: Math.round(this.activeObservationTimeMs / 1000),
      totalValidTrackingTimeSec: Math.round(this.validObservationTimeMs / 1000),
      overallCoveragePercent: this.getOverallCoverage(),
      totalRepsCompleted: this.completedReps.length,
      scoredRepsCount: scoredCount,
      medianQScore: medianQ,
      isPreliminary,
      repDetails: [...this.completedReps],
      observedCueIds: Array.from(this.observedCues),
      userReflection: options?.reflection,
      selfReportedEffort: options?.effort,
    };
  }
}
