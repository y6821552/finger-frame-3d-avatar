import { describe, expect, it, vi } from 'vitest';

import { ProceduralAvatar } from '../avatar/ProceduralAvatar';
import { roleById } from '../avatar/roles';
import { NEUTRAL_POSE } from '../motion/types';
import type { QualityProfile } from '../performance/QualityController';
import { CartoonScene, type SceneRenderer } from './CartoonScene';

const QUALITY: QualityProfile = {
  id: 'medium', width: 640, height: 360, shadows: true, bloom: false, targetFps: 30,
};

function fakeRenderer(): SceneRenderer {
  return {
    domElement: document.createElement('canvas'),
    shadowMap: { enabled: false },
    setPixelRatio: vi.fn(),
    setSize: vi.fn(),
    setClearColor: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
  };
}

describe('CartoonScene', () => {
  it('keeps a transparent camera background while switching roles', () => {
    const renderer = fakeRenderer();
    const scene = new CartoonScene({ renderer });
    const child = roleById('child-female');
    const adult = roleById('adult-female');
    scene.setAvatar(new ProceduralAvatar(child));

    scene.render(NEUTRAL_POSE, child, QUALITY, 0.016);
    scene.render(NEUTRAL_POSE, adult, QUALITY, 0.016);

    expect(scene.backgroundHex()).toBe('transparent');
    expect(renderer.setClearColor).toHaveBeenCalledWith(0x000000, 0);
    expect(renderer.render).toHaveBeenCalledTimes(2);
    expect(scene.canvas).toBe(renderer.domElement);
  });
});
