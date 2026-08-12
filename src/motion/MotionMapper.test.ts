import { describe, expect, it } from 'vitest';

import { MotionMapper } from './MotionMapper';
import type { Landmark, TrackingSnapshot } from '../tracking/types';

function snapshot(options: {
  time?: number;
  blendshapes?: Record<string, number>;
  matrix?: number[];
  shoulders?: { left: [number, number]; right: [number, number] };
  faceBox?: { left: number; right: number; top: number; bottom: number };
} = {}): TrackingSnapshot {
  const poseLandmarks: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5 }));
  if (options.shoulders) {
    poseLandmarks[11] = { x: options.shoulders.left[0], y: options.shoulders.left[1] };
    poseLandmarks[12] = { x: options.shoulders.right[0], y: options.shoulders.right[1] };
  }
  return {
    timestampMs: options.time ?? 0,
    hands: [],
    face: options.blendshapes
      ? {
          landmarks: options.faceBox
            ? [
                { x: options.faceBox.left, y: options.faceBox.top },
                { x: options.faceBox.right, y: options.faceBox.top },
                { x: options.faceBox.right, y: options.faceBox.bottom },
                { x: options.faceBox.left, y: options.faceBox.bottom },
              ]
            : [],
          blendshapes: options.blendshapes,
          transformationMatrix: options.matrix ?? [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        }
      : null,
    pose: options.shoulders ? { landmarks: poseLandmarks } : null,
  };
}

describe('MotionMapper', () => {
  it('maps independent blink, jaw, smile, and brow expressions', () => {
    const pose = new MotionMapper().update(
      snapshot({
        blendshapes: {
          eyeBlinkLeft: 0.7,
          eyeBlinkRight: 0.4,
          jawOpen: 0.8,
          mouthSmileLeft: 0.6,
          mouthSmileRight: 0.4,
          browInnerUp: 0.5,
          browDownLeft: 0.2,
        },
      }),
      0,
    );

    expect(pose.blinkLeft).toBeCloseTo(0.7);
    expect(pose.blinkRight).toBeCloseTo(0.4);
    expect(pose.mouthOpen).toBeCloseTo(0.8);
    expect(pose.smile).toBeCloseTo(0.5);
    expect(pose.browRaise).toBeCloseTo(0.5);
    expect(pose.browFrown).toBeCloseTo(0.1);
  });

  it('clamps head rotation and maps shoulder roll', () => {
    const yawNinetyDegrees = [0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1];
    const pose = new MotionMapper().update(
      snapshot({
        blendshapes: {},
        matrix: yawNinetyDegrees,
        shoulders: { left: [0.3, 0.4], right: [0.7, 0.6] },
      }),
      0,
    );

    expect(Math.abs(pose.head.y)).toBeCloseTo(Math.PI / 4);
    expect(pose.torsoRoll).toBeLessThan(0);
    const rearPose = new MotionMapper().update(
      snapshot({ shoulders: { left: [0.3, 0.4], right: [0.7, 0.6] } }),
      0,
      false,
    );
    expect(rearPose.torsoRoll).toBeGreaterThan(0);
  });

  it('holds face motion briefly and then returns toward neutral', () => {
    const mapper = new MotionMapper();
    const active = mapper.update(snapshot({ blendshapes: { jawOpen: 0.8 } }), 0);
    const held = mapper.update(snapshot({ time: 200 }), 200);
    const recovering = mapper.update(snapshot({ time: 900 }), 900);

    expect(active.mouthOpen).toBeCloseTo(0.8);
    expect(held.mouthOpen).toBeCloseTo(0.8);
    expect(recovering.mouthOpen).toBeLessThan(0.3);
    expect(recovering.breath).toBeGreaterThanOrEqual(-1);
    expect(recovering.breath).toBeLessThanOrEqual(1);
  });

  it('anchors and scales the avatar to the mirrored face and shoulders', () => {
    const pose = new MotionMapper().update(snapshot({
      blendshapes: {},
      faceBox: { left: 0.15, right: 0.35, top: 0.2, bottom: 0.5 },
      shoulders: { left: [0.1, 0.55], right: [0.5, 0.55] },
    }), 0, true);

    expect(pose.anchorX).toBeGreaterThan(0);
    expect(pose.anchorY).toBeGreaterThan(0);
    expect(pose.avatarScale).toBeGreaterThan(0.45);
    expect(pose.avatarScale).toBeLessThan(0.6);
  });

  it('centers an equal-size avatar on a centered frontal face', () => {
    const pose = new MotionMapper().update(snapshot({
      blendshapes: {},
      faceBox: { left: 0.35, right: 0.65, top: 0.24, bottom: 0.66 },
    }), 0);

    expect(pose.anchorX).toBeCloseTo(0, 5);
    expect(pose.anchorY).toBeCloseTo(0.14, 1);
    expect(pose.avatarScale).toBeGreaterThan(0.4);
    expect(pose.avatarScale).toBeLessThan(0.7);
  });

  it('maps mirrored and rear-camera horizontal centers in opposite directions', () => {
    const input = snapshot({
      blendshapes: {},
      faceBox: { left: 0.15, right: 0.35, top: 0.3, bottom: 0.6 },
    });
    const front = new MotionMapper().update(input, 0, true);
    const rear = new MotionMapper().update(input, 0, false);

    expect(front.anchorX).toBeCloseTo(-rear.anchorX, 5);
    expect(front.anchorX).toBeGreaterThan(0);
  });

  it('uses face size as the primary distance signal when shoulders are also tracked', () => {
    const farPose = new MotionMapper().update(snapshot({
      blendshapes: {},
      faceBox: { left: 0.425, right: 0.575, top: 0.25, bottom: 0.45 },
      shoulders: { left: [0.32, 0.58], right: [0.68, 0.58] },
    }), 0);
    const nearPose = new MotionMapper().update(snapshot({
      blendshapes: {},
      faceBox: { left: 0.35, right: 0.65, top: 0.16, bottom: 0.48 },
      shoulders: { left: [0.32, 0.58], right: [0.68, 0.58] },
    }), 0);

    expect(farPose.avatarScale).toBeLessThan(0.5);
    expect(nearPose.avatarScale).toBeGreaterThan(farPose.avatarScale + 0.1);
    expect(nearPose.avatarScale).toBeLessThanOrEqual(1.15);
  });

  it('inverts horizontal face motion only for a mirrored front camera', () => {
    const matrix = [0.866, 0, -0.5, 0, 0, 1, 0, 0, 0.5, 0, 0.866, 0, 0, 0, 0, 1];
    const front = new MotionMapper().update(snapshot({ blendshapes: {}, matrix }), 0, true);
    const rear = new MotionMapper().update(snapshot({ blendshapes: {}, matrix }), 0, false);

    expect(front.head.y).toBeCloseTo(-rear.head.y);
    expect(front.head.z).toBeCloseTo(-rear.head.z);
  });
});
