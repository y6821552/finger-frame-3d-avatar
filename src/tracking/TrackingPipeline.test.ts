import { describe, expect, it, vi } from 'vitest';

import { TrackingPipeline, type RawTrackers } from './TrackingPipeline';

function trackers(): RawTrackers {
  return {
    hands: {
      detectForVideo: vi.fn(() => ({
        landmarks: [[{ x: 0.2, y: 0.3, z: 0, visibility: 1 }]],
        handedness: [[{ categoryName: 'Left', displayName: 'Left', index: 0, score: 0.9 }]],
      })),
      close: vi.fn(),
    },
    face: {
      detectForVideo: vi.fn(() => ({
        faceLandmarks: [[{ x: 0.5, y: 0.3, z: 0, visibility: 1 }]],
        faceBlendshapes: [{
          headIndex: 0,
          headName: 'face',
          categories: [{ categoryName: 'jawOpen', displayName: 'jawOpen', index: 0, score: 0.7 }],
        }],
        facialTransformationMatrixes: [{
          rows: 4,
          columns: 4,
          data: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        }],
      })),
      close: vi.fn(),
    },
    pose: {
      detectForVideo: vi.fn(() => ({
        landmarks: [[{ x: 0.4, y: 0.4, z: 0, visibility: 1 }]],
        worldLandmarks: [[{ x: 0, y: 0, z: 0, visibility: 1 }]],
      })),
      close: vi.fn(),
    },
  };
}

describe('TrackingPipeline', () => {
  it('samples each tracker at its configured cadence and reuses latest output', async () => {
    const raw = trackers();
    const pipeline = new TrackingPipeline(raw, { handMs: 30, faceMs: 50, poseMs: 80 });
    await pipeline.start(document.createElement('video'));

    const first = await pipeline.sample(0);
    const early = await pipeline.sample(10);
    await pipeline.sample(40);
    await pipeline.sample(60);
    await pipeline.sample(90);

    expect(raw.hands.detectForVideo).toHaveBeenCalledTimes(3);
    expect(raw.face.detectForVideo).toHaveBeenCalledTimes(2);
    expect(raw.pose.detectForVideo).toHaveBeenCalledTimes(2);
    expect(first.face?.blendshapes.jawOpen).toBeCloseTo(0.7);
    expect(early.face).toEqual(first.face);
  });

  it('does not run trackers while suspended', async () => {
    const raw = trackers();
    const pipeline = new TrackingPipeline(raw);
    await pipeline.start(document.createElement('video'));
    await pipeline.sample(0);
    pipeline.setSuspended(true);
    await pipeline.sample(1_000);

    expect(raw.hands.detectForVideo).toHaveBeenCalledTimes(1);
    expect(raw.face.detectForVideo).toHaveBeenCalledTimes(1);
    expect(raw.pose.detectForVideo).toHaveBeenCalledTimes(1);
  });

  it('closes every MediaPipe task when stopped', async () => {
    const raw = trackers();
    const pipeline = new TrackingPipeline(raw);
    await pipeline.start(document.createElement('video'));

    pipeline.stop();

    expect(raw.hands.close).toHaveBeenCalledOnce();
    expect(raw.face.close).toHaveBeenCalledOnce();
    expect(raw.pose.close).toHaveBeenCalledOnce();
  });
});
