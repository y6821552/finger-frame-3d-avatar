import { describe, expect, it } from 'vitest';

import { FingerFrameTracker } from './FingerFrameTracker';
import type { HandObservation, Landmark, Size } from './types';

const VIEWPORT: Size = { width: 1_000, height: 600 };

function hand(points: {
  wrist: [number, number];
  middleMcp: [number, number];
  index: [number, number];
  thumb: [number, number];
}): HandObservation {
  const landmarks: Landmark[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  const put = (index: number, [screenX, screenY]: [number, number]) => {
    landmarks[index] = { x: 1 - screenX, y: screenY, z: 0 };
  };
  put(0, points.wrist);
  put(4, points.thumb);
  put(8, points.index);
  put(9, points.middleMcp);
  return { landmarks };
}

function openHands(offset = 0): HandObservation[] {
  return [
    hand({
      wrist: [0.22 + offset, 0.75],
      middleMcp: [0.22 + offset, 0.58],
      index: [0.18 + offset, 0.2],
      thumb: [0.18 + offset, 0.62],
    }),
    hand({
      wrist: [0.78 + offset, 0.75],
      middleMcp: [0.78 + offset, 0.58],
      index: [0.82 + offset, 0.2],
      thumb: [0.82 + offset, 0.62],
    }),
  ];
}

describe('FingerFrameTracker', () => {
  it('orders a valid frame by anatomical corner', () => {
    const state = new FingerFrameTracker().update(openHands(), VIEWPORT, 0);

    expect(state.active).toBe(true);
    expect(state.quad).toEqual([
      { x: 180, y: 120 },
      { x: 820, y: 120 },
      { x: 820, y: 372 },
      { x: 180, y: 372 },
    ]);
  });

  it('holds a stable quad through a short dropout', () => {
    const tracker = new FingerFrameTracker();
    const first = tracker.update(openHands(), VIEWPORT, 0);
    const dropout = tracker.update([], VIEWPORT, 33);

    expect(first.quad).not.toBeNull();
    expect(dropout.quad).toEqual(first.quad);
    expect(dropout.opacity).toBeGreaterThan(0);
  });

  it('rejects a far one-frame jump', () => {
    const tracker = new FingerFrameTracker();
    const first = tracker.update(openHands(-0.2), VIEWPORT, 0);
    const jumped = tracker.update(openHands(0.2), VIEWPORT, 33);

    expect(jumped.quad).toEqual(first.quad);
  });

  it('fades before clearing a lost frame', () => {
    const tracker = new FingerFrameTracker({ maxLostFrames: 1 });
    tracker.update(openHands(), VIEWPORT, 0);
    const held = tracker.update([], VIEWPORT, 33);
    const fading = tracker.update([], VIEWPORT, 66);

    expect(held.quad).not.toBeNull();
    expect(fading.quad).not.toBeNull();
    expect(fading.opacity).toBeLessThan(held.opacity);
  });

  it('combines alternating left and right detections during a short mobile tracking dropout', () => {
    const tracker = new FingerFrameTracker();
    const [screenLeft, screenRight] = openHands();
    screenLeft!.handedness = 'Right';
    screenRight!.handedness = 'Left';

    expect(tracker.update([screenLeft!], VIEWPORT, 0).active).toBe(false);
    const combined = tracker.update([screenRight!], VIEWPORT, 120);

    expect(combined.active).toBe(true);
    expect(combined.quad).not.toBeNull();
  });

  it('uses non-mirrored landmark coordinates for the rear camera', () => {
    const state = new FingerFrameTracker().update(openHands(), VIEWPORT, 0, false);

    expect(state.quad?.[0].x).toBe(180);
    expect(state.quad?.[1].x).toBe(820);
  });
});
