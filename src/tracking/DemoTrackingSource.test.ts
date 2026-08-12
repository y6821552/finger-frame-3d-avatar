import { describe, expect, it } from 'vitest';

import { DemoTrackingSource } from './DemoTrackingSource';

describe('DemoTrackingSource', () => {
  it('is deterministic for a fixed timestamp', async () => {
    const source = new DemoTrackingSource();
    await source.start(document.createElement('video'));

    expect(await source.sample(1_250)).toEqual(await source.sample(1_250));
  });

  it('generates two open frame hands and animated face and shoulders', async () => {
    const source = new DemoTrackingSource();
    await source.start(document.createElement('video'));
    const first = await source.sample(0);
    const later = await source.sample(900);

    expect(first.hands).toHaveLength(2);
    expect(first.hands[0]?.landmarks).toHaveLength(21);
    expect(first.face?.blendshapes).toHaveProperty('eyeBlinkLeft');
    expect(first.face?.blendshapes.jawOpen).not.toBe(later.face?.blendshapes.jawOpen);
    expect(first.pose?.landmarks[11]?.y).not.toBe(later.pose?.landmarks[11]?.y);
  });
});
