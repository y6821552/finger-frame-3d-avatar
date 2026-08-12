import { describe, expect, it, vi } from 'vitest';

import { FallbackTrackingSource } from './FallbackTrackingSource';
import type { TrackingSource } from './types';

function source(start: () => Promise<void>): TrackingSource {
  return {
    mode: 'fake', start: vi.fn(start),
    sample: vi.fn().mockResolvedValue({ timestampMs: 1, hands: [], face: null, pose: null }),
    setSuspended: vi.fn(), stop: vi.fn(),
  };
}

describe('FallbackTrackingSource', () => {
  it('switches to the fallback when the preferred tracker cannot start', async () => {
    const preferred = source(() => Promise.reject(new Error('worker unavailable')));
    const fallback = source(() => Promise.resolve());
    const tracker = new FallbackTrackingSource(preferred, vi.fn().mockResolvedValue(fallback));
    const video = document.createElement('video');

    await tracker.start(video);
    const snapshot = await tracker.sample(1);

    expect(preferred.stop).toHaveBeenCalledOnce();
    expect(fallback.start).toHaveBeenCalledWith(video);
    expect(snapshot.timestampMs).toBe(1);
    expect(tracker.mode).toContain('fallback');
  });

  it('switches to the fallback when the preferred tracker rejects its first video frame', async () => {
    const preferred = source(() => Promise.resolve());
    preferred.sample = vi.fn().mockRejectedValue(new Error('ImageBitmap unsupported'));
    const fallback = source(() => Promise.resolve());
    const createFallback = vi.fn().mockResolvedValue(fallback);
    const tracker = new FallbackTrackingSource(preferred, createFallback);
    const video = document.createElement('video');

    await tracker.start(video);
    const snapshot = await tracker.sample(42);

    expect(preferred.stop).toHaveBeenCalledOnce();
    expect(createFallback).toHaveBeenCalledOnce();
    expect(fallback.start).toHaveBeenCalledWith(video);
    expect(fallback.sample).toHaveBeenCalledWith(42);
    expect(snapshot.timestampMs).toBe(1);
    expect(tracker.mode).toContain('fallback');
  });
});
