import { NormalizedLandmark, Point2D } from './types';

/**
 * Clamps a number between min and max
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Euclidean norm / magnitude of 2D vector
 */
export function norm(p: Point2D): number {
  return Math.sqrt(p.x * p.x + p.y * p.y);
}

/**
 * Dot product of two 2D vectors
 */
export function dot(u: Point2D, v: Point2D): number {
  return u.x * v.x + u.y * v.y;
}

/**
 * Converts normalized coordinate [0,1] to pixel coordinate in source video space
 */
export function toPixelCoordinates(lm: NormalizedLandmark, width: number, height: number): Point2D {
  return {
    x: lm.x * width,
    y: lm.y * height,
  };
}

/**
 * Computes 2D angle in degrees at vertex B formed by segments BA and BC:
 * angle(A, B, C) = acos(clamp(dot(A-B, C-B) / (norm(A-B) * norm(C-B)), -1, 1)) * 180 / PI
 * Returns null if either segment length is too close to zero (degenerate triangle / zero-length segment).
 */
export function calculateAngle2D(a: Point2D, b: Point2D, c: Point2D, minSegmentLength: number = 1e-5): number | null {
  const ba: Point2D = { x: a.x - b.x, y: a.y - b.y };
  const bc: Point2D = { x: c.x - b.x, y: c.y - b.y };

  const normBA = norm(ba);
  const normBC = norm(bc);

  if (normBA < minSegmentLength || normBC < minSegmentLength) {
    return null; // Reject zero-length or degenerate segments
  }

  const cosine = dot(ba, bc) / (normBA * normBC);
  const clampedCos = clamp(cosine, -1.0, 1.0);
  const radians = Math.acos(clampedCos);
  return (radians * 180) / Math.PI;
}

/**
 * Extracts average confidence (presence & visibility) of a landmark
 */
export function getLandmarkConfidence(lm: NormalizedLandmark | undefined): number {
  if (!lm) return 0;
  const vis = lm.visibility ?? 1.0;
  const pres = lm.presence ?? 1.0;
  return Math.min(vis, pres);
}

/**
 * Selects the more visible side (left vs right) based on the mean confidence of joint sets
 */
export function selectMoreVisibleSide(
  landmarks: NormalizedLandmark[],
  leftIndices: number[],
  rightIndices: number[]
): 'left' | 'right' {
  const avgLeft = leftIndices.reduce((acc, idx) => acc + getLandmarkConfidence(landmarks[idx]), 0) / (leftIndices.length || 1);
  const avgRight = rightIndices.reduce((acc, idx) => acc + getLandmarkConfidence(landmarks[idx]), 0) / (rightIndices.length || 1);
  return avgLeft >= avgRight ? 'left' : 'right';
}
