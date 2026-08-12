import { describe, expect, it, vi } from 'vitest';

import { traceHandMask } from './HandMask';
import type { HandObservation, Landmark } from '../tracking/types';

function observation(offset: number): HandObservation {
  const landmarks: Landmark[] = Array.from({ length: 21 }, (_, index) => ({
    x: 0.2 + offset + (index % 4) * 0.025,
    y: 0.7 - Math.floor(index / 4) * 0.07,
  }));
  return { landmarks };
}

describe('traceHandMask', () => {
  it('traces palm fills, five finger chains, and a forearm for each hand', () => {
    const context = {
      beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), quadraticCurveTo: vi.fn(),
      closePath: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
      lineCap: '', lineJoin: '', lineWidth: 0, fillStyle: '', strokeStyle: '',
    } as unknown as CanvasRenderingContext2D;

    traceHandMask(context, [observation(0), observation(0.4)], { width: 1_000, height: 600 });

    expect(context.fill).toHaveBeenCalledTimes(4);
    expect(context.stroke).toHaveBeenCalledTimes(10);
    expect(context.quadraticCurveTo).toHaveBeenCalled();
  });

  it('uses raw x coordinates for a non-mirrored rear camera', () => {
    const moves: Array<[number, number]> = [];
    const context = {
      beginPath: vi.fn(), moveTo: vi.fn((x: number, y: number) => moves.push([x, y])),
      lineTo: vi.fn(), quadraticCurveTo: vi.fn(), closePath: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
      lineCap: '', lineJoin: '', lineWidth: 0, fillStyle: '', strokeStyle: '',
    } as unknown as CanvasRenderingContext2D;

    traceHandMask(context, [observation(0)], { width: 1_000, height: 600 }, false);

    expect(moves[0]?.[0]).toBeCloseTo(200);
  });
});
