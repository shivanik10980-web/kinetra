import { NormalizedLandmark, POSE_LANDMARKS } from '../pose/types';
import { calculateAngle2D, toPixelCoordinates, getLandmarkConfidence } from '../pose/geometry';
import { EmaAngleFilter } from '../pose/smoothing';
import { calculateCoverage } from '../scoring/metrics';
import {
  DrillDefinition,
  DrillEvent,
  PoseObservation,
  BallObservation,
  SportsSessionSummary,
} from './types';

export interface DrillEngineCallbacks {
  onEvent?: (event: DrillEvent) => void;
  onCue?: (cueText: string) => void;
  onIntervalCompleted?: (count: number) => void;
}

export class DrillEngine {
  private drill: DrillDefinition;
  private source: 'live' | 'guided' | 'demo';
  private callbacks: DrillEngineCallbacks;

  // Smoothing & filters
  private angleFilter: EmaAngleFilter;

  // State
  private isPaused: boolean = false;
  private startTimeMs: number = 0;
  private activeTimeMs: number = 0;
  private validTrackingTimeMs: number = 0;
  private lastTimestampMs: number = 0;
  private dwellStartTimeMs: number = 0;

  // Drill intervals
  private completedIntervals: number = 0;
  private currentPhase: 'SETUP' | 'ACTIVE_HOLD' | 'TRANSITION' | 'RECOVER' = 'SETUP';
  private observedCuesCount: Record<string, number> = {};
  private lastCueTimeMs: number = -10000;
  private cueCooldownMs: number = 3500;
  private unknownItems: Set<string> = new Set();
  private confidenceAccumulator: number = 0;
  private confidenceSampleCount: number = 0;
  private manualConfirmedCount: number = 0;

  constructor(
    drill: DrillDefinition,
    source: 'live' | 'guided' | 'demo' = 'live',
    callbacks: DrillEngineCallbacks = {}
  ) {
    this.drill = drill;
    this.source = source;
    this.callbacks = callbacks;
    this.angleFilter = new EmaAngleFilter({ alpha: 0.35, confidenceThreshold: 0.55, maxGapMs: 500 });
  }

  public getCompletedIntervals(): number {
    return this.completedIntervals;
  }

  public getPhase(): string {
    return this.currentPhase;
  }

  public getCoverage(): number {
    return calculateCoverage(this.validTrackingTimeMs, this.activeTimeMs);
  }

  public pause(): void {
    if (!this.isPaused) {
      this.isPaused = true;
      this.triggerCue('Practice paused. Take a breath.');
      this.callbacks.onEvent?.({
        type: 'phase',
        timestampMs: Date.now(),
        confidence: 1.0,
        evidence: ['user_paused'],
      });
    }
  }

  public resume(timestampMs: number = Date.now()): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.lastTimestampMs = timestampMs;
      this.angleFilter.reset();
      this.dwellStartTimeMs = 0;
      this.currentPhase = 'SETUP';
    }
  }

  public manualIncrement(): void {
    this.manualConfirmedCount++;
    this.completedIntervals++;
    this.callbacks.onIntervalCompleted?.(this.completedIntervals);
    this.callbacks.onEvent?.({
      type: 'manual-confirmation',
      timestampMs: Date.now(),
      confidence: 1.0,
      evidence: ['manual_tap'],
    });
    this.triggerCue('Interval confirmed');
  }

  private triggerCue(cueText: string): void {
    const now = Date.now();
    this.observedCuesCount[cueText] = (this.observedCuesCount[cueText] || 0) + 1;
    if (now - this.lastCueTimeMs >= this.cueCooldownMs) {
      this.lastCueTimeMs = now;
      this.callbacks.onCue?.(cueText);
    }
  }

  public processPoseFrame(
    landmarks: NormalizedLandmark[],
    timestampMs: number,
    width: number = 640,
    height: number = 480
  ): PoseObservation {
    if (this.isPaused) {
      return {
        timestampMs,
        trackingCoverage: this.getCoverage(),
        jointConfidence: {},
        angles: {},
      };
    }

    if (this.startTimeMs === 0) {
      this.startTimeMs = timestampMs;
    }

    const deltaMs = this.lastTimestampMs > 0 ? Math.max(0, timestampMs - this.lastTimestampMs) : 0;
    this.lastTimestampMs = timestampMs;
    this.activeTimeMs += deltaMs;

    // Tracking loss detection (>500ms gap)
    if (deltaMs > 500) {
      this.angleFilter.reset();
      this.dwellStartTimeMs = 0;
      this.currentPhase = 'SETUP';
      this.triggerCue('Position reset. Step into clear view.');
      this.callbacks.onEvent?.({
        type: 'tracking-lost',
        timestampMs,
        confidence: 0,
        evidence: ['gap_exceeded_500ms'],
      });
      return {
        timestampMs,
        trackingCoverage: this.getCoverage(),
        jointConfidence: {},
        angles: {},
      };
    }

    // Extract relevant joints based on drill category
    let jointConfidence: Record<string, number> = {};
    let angles: Record<string, number | null> = {};

    if (landmarks.length === 0) {
      this.unknownItems.add('Body joints out of view');
      return {
        timestampMs,
        trackingCoverage: this.getCoverage(),
        jointConfidence,
        angles,
      };
    }

    // Check knee flexion for stance/slides/footwork
    const hip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const knee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const ankle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];

    const confHip = getLandmarkConfidence(hip);
    const confKnee = getLandmarkConfidence(knee);
    const confAnkle = getLandmarkConfidence(ankle);
    const meanConfidence = (confHip + confKnee + confAnkle) / 3;

    jointConfidence = {
      hip: confHip,
      knee: confKnee,
      ankle: confAnkle,
      mean: meanConfidence,
    };

    this.confidenceAccumulator += meanConfidence;
    this.confidenceSampleCount++;

    // Confidence Gate (0.60)
    if (meanConfidence < 0.60) {
      this.unknownItems.add('Knee flexion confidence below 0.60');
      angles.knee = null;
      return {
        timestampMs,
        trackingCoverage: this.getCoverage(),
        jointConfidence,
        angles,
      };
    }

    // Valid tracking frame
    this.validTrackingTimeMs += deltaMs;

    const hipPx = toPixelCoordinates(hip, width, height);
    const kneePx = toPixelCoordinates(knee, width, height);
    const anklePx = toPixelCoordinates(ankle, width, height);

    const rawKneeAngle = calculateAngle2D(hipPx, kneePx, anklePx);
    const smoothedAngle = rawKneeAngle !== null ? this.angleFilter.update(rawKneeAngle, timestampMs, meanConfidence) : null;
    angles.knee = smoothedAngle;

    // Run drill rules
    if (smoothedAngle !== null && this.drill.rules.length > 0) {
      const primaryRule = this.drill.rules[0];
      const targetMin = primaryRule.targetAngleMin ?? 120;
      const targetMax = primaryRule.targetAngleMax ?? 150;
      const targetDwell = primaryRule.targetDwellMs ?? 300;
      const exitDelta = primaryRule.hysteresisExitDelta ?? 8;

      if (smoothedAngle >= targetMin && smoothedAngle <= targetMax) {
        // Inside target stance range
        if (this.currentPhase !== 'ACTIVE_HOLD') {
          this.currentPhase = 'ACTIVE_HOLD';
          this.dwellStartTimeMs = timestampMs;
          this.triggerCue('Hold active stance');
        } else {
          // Check dwell
          const elapsedDwell = timestampMs - this.dwellStartTimeMs;
          if (elapsedDwell >= targetDwell) {
            this.completedIntervals++;
            this.callbacks.onIntervalCompleted?.(this.completedIntervals);
            this.callbacks.onEvent?.({
              type: 'interval',
              timestampMs,
              confidence: meanConfidence,
              evidence: [`dwell_${elapsedDwell}ms`, `angle_${Math.round(smoothedAngle)}deg`],
            });
            this.triggerCue('Good stance interval. Reset.');
            this.currentPhase = 'RECOVER';
            this.dwellStartTimeMs = 0;
          }
        }
      } else if (this.currentPhase === 'ACTIVE_HOLD') {
        // Check hysteresis exit
        if (smoothedAngle < targetMin - exitDelta || smoothedAngle > targetMax + exitDelta) {
          this.currentPhase = 'TRANSITION';
          this.dwellStartTimeMs = 0;
          this.triggerCue('Adjust stance to comfortable athletic bend');
        }
      } else if (this.currentPhase === 'RECOVER' && smoothedAngle >= 155) {
        // Return to upright ready position for next rep
        this.currentPhase = 'SETUP';
      }
    }

    return {
      timestampMs,
      trackingCoverage: this.getCoverage(),
      jointConfidence,
      angles,
    };
  }

  public createSessionSummary(options?: { reflection?: string; elapsedSec?: number }): SportsSessionSummary {
    const meanConfidence =
      this.confidenceSampleCount > 0
        ? Math.round((this.confidenceAccumulator / this.confidenceSampleCount) * 100) / 100
        : null;

    const computedDuration =
      options?.elapsedSec !== undefined
        ? options.elapsedSec
        : this.activeTimeMs > 0
        ? Math.round(this.activeTimeMs / 1000)
        : this.startTimeMs > 0
        ? Math.max(1, Math.round((Date.now() - this.startTimeMs) / 1000))
        : 0;

    const nowIso = new Date().toISOString();
    const startedIso =
      this.startTimeMs > 0
        ? new Date(Date.now() - computedDuration * 1000).toISOString()
        : nowIso;

    // Honest coverage & unknown accounting: 0 if manual/guided
    if (this.source === 'guided' || this.drill.mode === 'manual' || this.drill.mode === 'timed') {
      this.unknownItems.add('Optical Camera Feed (Guided/Manual Mode)');
    }

    const coverage =
      this.source === 'guided' || this.drill.mode === 'manual' || this.drill.mode === 'timed'
        ? 0
        : this.getCoverage();

    return {
      id: `sports_${this.drill.id}_${Date.now()}`,
      sportId: this.drill.sportId,
      drillId: this.drill.id,
      drillTitle: this.drill.title,
      mode: this.drill.mode,
      source: this.source,
      startedAt: startedIso,
      endedAt: nowIso,
      durationSec: Math.max(1, computedDuration),
      completedIntervals: this.completedIntervals,
      trackingCoverage: coverage,
      meanConfidence,
      observedCuesCount: { ...this.observedCuesCount },
      unknownItems: Array.from(this.unknownItems),
      manuallyConfirmedCount: this.manualConfirmedCount,
      reflection: options?.reflection,
    };
  }
}
