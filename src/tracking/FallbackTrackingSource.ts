import type { TrackingSnapshot, TrackingSource } from './types';

export class FallbackTrackingSource implements TrackingSource {
  private active: TrackingSource;
  private usingFallback = false;
  private video: HTMLVideoElement | null = null;

  constructor(
    private readonly preferred: TrackingSource,
    private readonly createFallback: () => Promise<TrackingSource>,
  ) {
    this.active = preferred;
  }

  get mode(): string {
    return this.usingFallback ? `fallback:${this.active.mode}` : this.active.mode;
  }

  async start(video: HTMLVideoElement): Promise<void> {
    this.video = video;
    try {
      await this.preferred.start(video);
      this.active = this.preferred;
    } catch {
      this.preferred.stop();
      this.active = await this.createFallback();
      this.usingFallback = true;
      await this.active.start(video);
    }
  }

  async sample(nowMs: number): Promise<TrackingSnapshot> {
    try {
      return await this.active.sample(nowMs);
    } catch (error) {
      if (this.usingFallback || !this.video) throw error;
      this.preferred.stop();
      this.active = await this.createFallback();
      this.usingFallback = true;
      await this.active.start(this.video);
      return this.active.sample(nowMs);
    }
  }

  setSuspended(suspended: boolean): void {
    this.active.setSuspended(suspended);
  }

  stop(): void {
    this.video = null;
    this.active.stop();
  }
}
