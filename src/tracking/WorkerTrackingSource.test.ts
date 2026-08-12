import { describe, expect, it, vi } from 'vitest';

import { WorkerTrackingSource, type TrackingWorkerLike } from './WorkerTrackingSource';
import type { TrackingSnapshot } from './types';

class FakeWorker implements TrackingWorkerLike {
  readonly postMessage = vi.fn();
  readonly terminate = vi.fn();
  private listener: ((event: MessageEvent) => void) | null = null;

  addEventListener(_type: 'message', listener: (event: MessageEvent) => void): void {
    this.listener = listener;
  }

  emit(data: unknown): void {
    this.listener?.({ data } as MessageEvent);
  }
}

const SNAPSHOT: TrackingSnapshot = { timestampMs: 20, hands: [], face: null, pose: null };

describe('WorkerTrackingSource', () => {
  it('initializes a worker and transfers camera frames for tracking', async () => {
    const worker = new FakeWorker();
    const bitmap = { close: vi.fn() } as unknown as ImageBitmap;
    const source = new WorkerTrackingSource({
      worker,
      createFrame: vi.fn().mockResolvedValue(bitmap),
      assetBase: '/app/',
    });
    const start = source.start(document.createElement('video'));
    worker.emit({ type: 'ready' });
    await start;

    const sample = source.sample(20);
    await Promise.resolve();
    worker.emit({ type: 'result', snapshot: SNAPSHOT });

    await expect(sample).resolves.toEqual(SNAPSHOT);
    expect(worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'frame', timestampMs: 20, frame: bitmap }),
      [bitmap],
    );
  });

  it('returns its last snapshot without transferring frames while suspended', async () => {
    const worker = new FakeWorker();
    const createFrame = vi.fn();
    const source = new WorkerTrackingSource({ worker, createFrame, assetBase: '/' });
    const start = source.start(document.createElement('video'));
    worker.emit({ type: 'ready' });
    await start;
    source.setSuspended(true);

    const snapshot = await source.sample(200);

    expect(snapshot.hands).toEqual([]);
    expect(createFrame).not.toHaveBeenCalled();
  });
});
