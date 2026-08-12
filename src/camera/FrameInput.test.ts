import { describe, expect, it, vi } from 'vitest';

import { BrowserFrameInput, DemoFrameInput } from './FrameInput';

describe('frame inputs', () => {
  it('exposes the active browser video dimensions and delegates lifecycle', async () => {
    const video = Object.assign(document.createElement('video'), { width: 640, height: 360 });
    Object.defineProperties(video, {
      videoWidth: { value: 1_280 },
      videoHeight: { value: 720 },
    });
    const camera = { video, start: vi.fn().mockResolvedValue(video), stop: vi.fn() };
    const input = new BrowserFrameInput(camera);

    await input.start('environment');
    expect(input.mirrored).toBe(false);
    await input.start('user');
    expect(input.mirrored).toBe(true);
    expect(input.frame).toBe(video);
    expect([input.width, input.height]).toEqual([1_280, 720]);
    input.stop();
    expect(camera.stop).toHaveBeenCalledOnce();
  });

  it('paints and schedules the deterministic demo until stopped', async () => {
    const scheduled: { callback?: FrameRequestCallback } = {};
    const cancelFrame = vi.fn();
    const context = { clearRect: vi.fn(), fillRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(),
      fill: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), quadraticCurveTo: vi.fn(), stroke: vi.fn(),
      save: vi.fn(), restore: vi.fn(), createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: 'butt' } as unknown as CanvasRenderingContext2D;
    const input = new DemoFrameInput({
      canvas: document.createElement('canvas'),
      context,
      requestFrame: (next) => { scheduled.callback = next; return 9; },
      cancelFrame,
    });

    await input.start('user');
    expect(input.width).toBe(1_280);
    expect(context.fillRect).toHaveBeenCalled();
    scheduled.callback?.(16);
    input.stop();
    expect(cancelFrame).toHaveBeenCalledWith(9);
  });
});
