export type QualityId = 'high' | 'medium' | 'low';
export type QualityMode = 'auto' | QualityId;

export interface QualityProfile {
  id: QualityId;
  width: number;
  height: number;
  shadows: boolean;
  bloom: boolean;
  targetFps: number;
}

const PROFILES: Record<QualityId, QualityProfile> = {
  high: { id: 'high', width: 960, height: 540, shadows: true, bloom: true, targetFps: 30 },
  medium: { id: 'medium', width: 640, height: 360, shadows: true, bloom: false, targetFps: 30 },
  low: { id: 'low', width: 480, height: 270, shadows: false, bloom: false, targetFps: 24 },
};

export interface QualityControllerOptions {
  initial?: QualityId;
  downgradeSamples?: number;
}

export class QualityController {
  private mode: QualityMode = 'auto';
  private automaticId: QualityId;
  private missedSamples = 0;
  private readonly downgradeSamples: number;

  constructor(options: QualityControllerOptions = {}) {
    this.automaticId = options.initial ?? chooseInitialQuality();
    this.downgradeSamples = options.downgradeSamples ?? 90;
  }

  setMode(mode: QualityMode): QualityProfile {
    this.mode = mode;
    this.missedSamples = 0;
    return this.current();
  }

  getMode(): QualityMode {
    return this.mode;
  }

  current(): QualityProfile {
    return PROFILES[this.mode === 'auto' ? this.automaticId : this.mode];
  }

  sample(frameMs: number): QualityProfile {
    if (this.mode !== 'auto') return this.current();
    const profile = PROFILES[this.automaticId];
    if (frameMs > 1_000 / profile.targetFps + 4) {
      this.missedSamples += 1;
      if (this.missedSamples >= this.downgradeSamples) {
        this.automaticId = this.automaticId === 'high' ? 'medium' : 'low';
        this.missedSamples = 0;
      }
    } else {
      this.missedSamples = Math.max(0, this.missedSamples - 1);
    }
    return this.current();
  }
}

function chooseInitialQuality(): QualityId {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency || 4;
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (mobile || memory <= 4 || cores <= 4) return 'medium';
  return 'high';
}
