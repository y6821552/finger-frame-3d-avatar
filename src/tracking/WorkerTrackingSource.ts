import type { TrackingSnapshot, TrackingSource } from './types';

export interface TrackingWorkerLike {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
  terminate(): void;
}

export interface WorkerTrackingSourceOptions {
  worker: TrackingWorkerLike;
  createFrame: (video: HTMLVideoElement) => Promise<ImageBitmap>;
  assetBase: string;
}

type WorkerResponse =
  | { type: 'ready' }
  | { type: 'result'; snapshot: TrackingSnapshot }
  | { type: 'error'; message: string };

export class WorkerTrackingSource implements TrackingSource {
  readonly mode = 'worker';
  private video: HTMLVideoElement | null = null;
  private suspended = false;
  private latest: TrackingSnapshot = { timestampMs: 0, hands: [], face: null, pose: null };
  private readyResolve: (() => void) | null = null;
  private readyReject: ((reason: Error) => void) | null = null;
  private sampleResolve: ((snapshot: TrackingSnapshot) => void) | null = null;
  private sampleReject: ((reason: Error) => void) | null = null;

  constructor(private readonly options: WorkerTrackingSourceOptions) {
    options.worker.addEventListener('message', (event) => this.handleMessage(event.data as WorkerResponse));
  }

  async start(video: HTMLVideoElement): Promise<void> {
    this.video = video;
    const ready = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
    this.options.worker.postMessage({ type: 'init', assetBase: this.options.assetBase });
    return ready;
  }

  async sample(nowMs: number): Promise<TrackingSnapshot> {
    if (this.suspended || !this.video || this.sampleResolve) return structuredClone(this.latest);
    const frame = await this.options.createFrame(this.video);
    const result = new Promise<TrackingSnapshot>((resolve, reject) => {
      this.sampleResolve = resolve;
      this.sampleReject = reject;
    });
    this.options.worker.postMessage({ type: 'frame', frame, timestampMs: nowMs }, [frame]);
    return result;
  }

  setSuspended(suspended: boolean): void {
    this.suspended = suspended;
  }

  stop(): void {
    this.video = null;
    this.readyReject?.(new Error('Tracking worker stopped'));
    this.sampleReject?.(new Error('Tracking worker stopped'));
    this.clearPending();
    this.options.worker.postMessage({ type: 'stop' });
    this.options.worker.terminate();
  }

  private handleMessage(response: WorkerResponse): void {
    if (response.type === 'ready') {
      this.readyResolve?.();
      this.readyResolve = null;
      this.readyReject = null;
      return;
    }
    if (response.type === 'result') {
      this.latest = response.snapshot;
      this.sampleResolve?.(structuredClone(response.snapshot));
      this.sampleResolve = null;
      this.sampleReject = null;
      return;
    }
    const error = new Error(response.message);
    this.readyReject?.(error);
    this.sampleReject?.(error);
    this.clearPending();
  }

  private clearPending(): void {
    this.readyResolve = null;
    this.readyReject = null;
    this.sampleResolve = null;
    this.sampleReject = null;
  }
}

export function supportsWorkerTracking(): boolean {
  return typeof Worker !== 'undefined' && typeof createImageBitmap === 'function';
}

export function createWorkerTrackingSource(): WorkerTrackingSource {
  const worker = new Worker(new URL('./tracking.worker.ts', import.meta.url), { type: 'module' });
  return new WorkerTrackingSource({
    worker,
    createFrame: (video) => createImageBitmap(video),
    assetBase: import.meta.env.BASE_URL,
  });
}
