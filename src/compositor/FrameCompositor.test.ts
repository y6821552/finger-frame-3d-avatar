import { describe, expect, it, vi } from 'vitest';

import { FrameCompositor } from './FrameCompositor';
import type { FingerFrameState } from '../tracking/FingerFrameTracker';

function recordingContext(log: string[]): CanvasRenderingContext2D {
  return {
    save: vi.fn(), restore: vi.fn(),
    translate: vi.fn(() => log.push('translate')),
    scale: vi.fn(() => log.push('scale')),
    clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(),
    clip: vi.fn(() => log.push('clip')), stroke: vi.fn(() => log.push('outline')), fill: vi.fn(),
    arc: vi.fn(), setLineDash: vi.fn(),
    drawImage: vi.fn((source: { id?: string }) => log.push(source.id ?? 'unknown')),
    globalAlpha: 1, lineWidth: 1, strokeStyle: '', fillStyle: '', lineDashOffset: 0,
  } as unknown as CanvasRenderingContext2D;
}

const ACTIVE_FRAME: FingerFrameState = {
  quad: [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 70 }, { x: 10, y: 70 }],
  opacity: 1,
  hands: [],
  active: true,
};

describe('FrameCompositor', () => {
  it('draws camera, clipped scene, real hands, and decoration in order', () => {
    const log: string[] = [];
    const canvas = Object.assign(document.createElement('canvas'), { width: 100, height: 80 });
    const compositor = new FrameCompositor(canvas, recordingContext(log));

    compositor.draw({
      camera: { id: 'camera' } as unknown as CanvasImageSource,
      scene: { id: 'scene' } as unknown as CanvasImageSource,
      handOverlay: { id: 'hands' } as unknown as CanvasImageSource,
      frame: ACTIVE_FRAME,
      nowMs: 100,
      mirrored: true,
    });

    expect(log).toEqual(['translate', 'scale', 'camera', 'clip', 'scene', 'hands', 'outline']);
  });

  it('skips scene and hand overlay when the frame is transparent', () => {
    const log: string[] = [];
    const canvas = Object.assign(document.createElement('canvas'), { width: 100, height: 80 });
    const compositor = new FrameCompositor(canvas, recordingContext(log));

    compositor.draw({
      camera: { id: 'camera' } as unknown as CanvasImageSource,
      scene: { id: 'scene' } as unknown as CanvasImageSource,
      handOverlay: null,
      frame: { ...ACTIVE_FRAME, opacity: 0 },
      nowMs: 100,
      mirrored: true,
    });

    expect(log).toEqual(['translate', 'scale', 'camera']);
  });

  it('does not mirror the rear camera frame', () => {
    const log: string[] = [];
    const canvas = Object.assign(document.createElement('canvas'), { width: 100, height: 80 });
    const compositor = new FrameCompositor(canvas, recordingContext(log));

    compositor.draw({
      camera: { id: 'camera' } as unknown as CanvasImageSource,
      scene: { id: 'scene' } as unknown as CanvasImageSource,
      handOverlay: null,
      frame: { ...ACTIVE_FRAME, opacity: 0 },
      nowMs: 100,
      mirrored: false,
    });

    expect(log).toEqual(['camera']);
  });
});
