import { NormalizedLandmark } from '../pose/types';

export type SportId = 'football' | 'basketball';

export type DrillMode = 'pose' | 'timed' | 'manual' | 'pose-plus-optional-ball';

export interface DrillRule {
  id: string;
  name: string;
  minConfidence: number; // e.g. 0.60
  targetAngleMin?: number;
  targetAngleMax?: number;
  targetDwellMs?: number;
  hysteresisExitDelta?: number;
}

export interface DrillDefinition {
  id: string;
  sportId: SportId;
  title: string;
  shortDesc: string;
  mode: DrillMode;
  supportedObservations: string[];
  setupSteps: string[];
  rules: DrillRule[];
  defaultDurationSec: number;
  targetIntervalCount: number;
  category: 'footwork' | 'stance' | 'touches' | 'shooting_rehearsal' | 'slides' | 'passing';
}

export interface SportDefinition {
  id: SportId;
  name: string;
  tagline: string;
  description: string;
  accentColor: string;
  drills: DrillDefinition[];
}

export interface PoseObservation {
  timestampMs: number;
  trackingCoverage: number;
  jointConfidence: Record<string, number>;
  angles: Record<string, number | null>;
}

export interface BallObservation {
  timestampMs: number;
  detected: boolean;
  confidence: number | null;
  x: number | null;
  y: number | null;
}

export interface DrillEvent {
  type: 'phase' | 'cue' | 'interval' | 'manual-confirmation' | 'tracking-lost';
  timestampMs: number;
  confidence: number | null;
  evidence: string[];
}

export interface SportsSessionSummary {
  id: string;
  sportId: SportId;
  drillId: string;
  drillTitle: string;
  mode: DrillMode;
  source: 'live' | 'guided' | 'demo';
  startedAt: string;
  endedAt: string;
  durationSec: number;
  completedIntervals: number;
  trackingCoverage: number;
  meanConfidence: number | null;
  observedCuesCount: Record<string, number>;
  unknownItems: string[];
  manuallyConfirmedCount?: number;
  reflection?: string;
}
