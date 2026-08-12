import { describe, expect, it, vi } from 'vitest';

import { NEUTRAL_POSE } from '../motion/types';
import { roleById } from '../avatar/roles';
import { ToonRenderer } from './ToonRenderer';

describe('ToonRenderer', () => {
  it('renders a role-colored animated bust without WebGL', () => {
    const context = {
      clearRect: vi.fn(), fillRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), ellipse: vi.fn(),
      fill: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), quadraticCurveTo: vi.fn(), stroke: vi.fn(),
      save: vi.fn(), restore: vi.fn(), translate: vi.fn(), rotate: vi.fn(), scale: vi.fn(),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: 'butt', globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;
    const canvas = document.createElement('canvas');
    const renderer = new ToonRenderer(canvas, context);

    expect(renderer.render(canvas, roleById('senior-female'), NEUTRAL_POSE, { width: 640, height: 360 }, 100))
      .toBe(canvas);
    expect(canvas.width).toBe(640);
    expect(context.ellipse).toHaveBeenCalled();
  });

  it('applies tracked face position and distance in the Canvas fallback', () => {
    const context = {
      clearRect: vi.fn(), fillRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), ellipse: vi.fn(),
      fill: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), quadraticCurveTo: vi.fn(), stroke: vi.fn(),
      save: vi.fn(), restore: vi.fn(), translate: vi.fn(), rotate: vi.fn(), scale: vi.fn(),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: 'butt', globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;
    const canvas = document.createElement('canvas');
    const renderer = new ToonRenderer(canvas, context);
    const pose = { ...NEUTRAL_POSE, anchorX: 0.968, anchorY: 0.272, avatarScale: 0.6 };

    renderer.render(canvas, roleById('adult-female'), pose, { width: 960, height: 540 }, 100);

    expect(context.translate).toHaveBeenCalledWith(672, 216);
    expect(context.scale).toHaveBeenCalledWith(0.6, 0.6);
  });
});
