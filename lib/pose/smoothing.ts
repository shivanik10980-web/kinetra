import { Point2D } from './types';

export interface SmoothingConfig {
  alpha: number; // default 0.35
  confidenceThreshold: number; // default 0.65
  maxGapMs: number; // default 500ms
}

export const DEFAULT_SMOOTHING_CONFIG: SmoothingConfig = {
  alpha: 0.35,
  confidenceThreshold: 0.65,
  maxGapMs: 500,
};

/**
 * 1D Exponential Moving Average Filter
 */
export class EmaAngleFilter {
  private lastValue: number | null = null;
  private lastTimestampMs: number = 0;
  private config: SmoothingConfig;

  constructor(config: Partial<SmoothingConfig> = {}) {
    this.config = { ...DEFAULT_SMOOTHING_CONFIG, ...config };
  }

  public update(currentValue: number, timestampMs: number, confidence: number = 1.0): number | null {
    // Check confidence gate
    if (confidence < this.config.confidenceThreshold) {
      return null;
    }

    // Check time gap
    if (this.lastValue !== null && timestampMs - this.lastTimestampMs > this.config.maxGapMs) {
      // Gap exceeded threshold, reset state
      this.lastValue = currentValue;
      this.lastTimestampMs = timestampMs;
      return currentValue;
    }

    if (this.lastValue === null) {
      this.lastValue = currentValue;
    } else {
      this.lastValue = this.config.alpha * currentValue + (1 - this.config.alpha) * this.lastValue;
    }

    this.lastTimestampMs = timestampMs;
    return this.lastValue;
  }

  public reset(): void {
    this.lastValue = null;
    this.lastTimestampMs = 0;
  }

  public getLatest(): number | null {
    return this.lastValue;
  }
}

/**
 * 2D Exponential Moving Average Filter for coordinates
 */
export class EmaPointFilter {
  private lastPoint: Point2D | null = null;
  private lastTimestampMs: number = 0;
  private config: SmoothingConfig;

  constructor(config: Partial<SmoothingConfig> = {}) {
    this.config = { ...DEFAULT_SMOOTHING_CONFIG, ...config };
  }

  public update(point: Point2D, timestampMs: number, confidence: number = 1.0): Point2D | null {
    if (confidence < this.config.confidenceThreshold) {
      return null;
    }

    if (this.lastPoint !== null && timestampMs - this.lastTimestampMs > this.config.maxGapMs) {
      this.lastPoint = { ...point };
      this.lastTimestampMs = timestampMs;
      return point;
    }

    if (this.lastPoint === null) {
      this.lastPoint = { ...point };
    } else {
      this.lastPoint = {
        x: this.config.alpha * point.x + (1 - this.config.alpha) * this.lastPoint.x,
        y: this.config.alpha * point.y + (1 - this.config.alpha) * this.lastPoint.y,
      };
    }

    this.lastTimestampMs = timestampMs;
    return { ...this.lastPoint };
  }

  public reset(): void {
    this.lastPoint = null;
    this.lastTimestampMs = 0;
  }
}
