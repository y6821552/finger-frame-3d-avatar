import type { Landmark } from '../tracking/types';

export interface FaceRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

const CONTOUR = { left: 234, right: 454, top: 10, bottom: 152 } as const;

export function measureFaceRect(landmarks: readonly Landmark[]): FaceRect | null {
  const contour = landmarks.length > CONTOUR.right
    ? [
        landmarks[CONTOUR.left],
        landmarks[CONTOUR.right],
        landmarks[CONTOUR.top],
        landmarks[CONTOUR.bottom],
      ]
    : null;
  const points = contour?.every(isFinitePoint) ? contour : landmarks.filter(isFinitePoint);
  if (!points || points.length < 2) return null;

  const left = contour
    ? Math.min(contour[0]!.x, contour[1]!.x)
    : Math.min(...points.map((point) => point.x));
  const right = contour
    ? Math.max(contour[0]!.x, contour[1]!.x)
    : Math.max(...points.map((point) => point.x));
  const top = contour ? contour[2]!.y : Math.min(...points.map((point) => point.y));
  const bottom = contour ? contour[3]!.y : Math.max(...points.map((point) => point.y));
  const width = right - left;
  const height = bottom - top;
  if (width < 0.01 || height < 0.01) return null;

  return {
    left,
    right,
    top,
    bottom,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
    width,
    height,
  };
}

function isFinitePoint(point: Landmark | undefined): point is Landmark {
  return Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y));
}
