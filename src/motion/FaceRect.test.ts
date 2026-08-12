import { describe, expect, it } from 'vitest';

import { measureFaceRect } from './FaceRect';

describe('measureFaceRect', () => {
  it('measures the stable MediaPipe forehead, chin, and cheek contour', () => {
    const landmarks = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
    landmarks[234] = { x: 0.35, y: 0.5 };
    landmarks[454] = { x: 0.65, y: 0.5 };
    landmarks[10] = { x: 0.5, y: 0.24 };
    landmarks[152] = { x: 0.5, y: 0.66 };

    const rect = measureFaceRect(landmarks);

    expect(rect?.centerX).toBeCloseTo(0.5);
    expect(rect?.centerY).toBeCloseTo(0.45);
    expect(rect?.width).toBeCloseTo(0.3);
    expect(rect?.height).toBeCloseTo(0.42);
  });

  it('falls back to reduced landmark bounds and rejects a degenerate face', () => {
    const rect = measureFaceRect([
      { x: 0.4, y: 0.3 },
      { x: 0.6, y: 0.3 },
      { x: 0.6, y: 0.7 },
      { x: 0.4, y: 0.7 },
    ]);

    expect(rect?.width).toBeCloseTo(0.2);
    expect(rect?.height).toBeCloseTo(0.4);
    expect(measureFaceRect([{ x: 0.5, y: 0.5 }])).toBeNull();
  });

  it('ignores invalid fallback landmarks', () => {
    expect(measureFaceRect([
      { x: Number.NaN, y: 0.3 },
      { x: 0.4, y: 0.3 },
      { x: 0.6, y: 0.7 },
    ])).toEqual(expect.objectContaining({ left: 0.4, right: 0.6 }));
  });
});
