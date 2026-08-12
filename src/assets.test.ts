// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const MODELS = {
  'hand_landmarker.task': 'fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1',
  'face_landmarker.task': '64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff',
  'pose_landmarker_lite.task': '59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a',
} as const;

describe('local runtime assets', () => {
  it.each(Object.entries(MODELS))('%s matches the audited SHA-256', (filename, expected) => {
    const data = readFileSync(resolve('public/models', filename));
    expect(createHash('sha256').update(data).digest('hex')).toBe(expected);
  });

  it('ships SIMD and non-SIMD MediaPipe WASM variants', () => {
    for (const filename of [
      'vision_wasm_internal.wasm',
      'vision_wasm_module_internal.wasm',
      'vision_wasm_nosimd_internal.wasm',
    ]) {
      expect(statSync(resolve('public/wasm', filename)).size).toBeGreaterThan(10_000_000);
    }
  });
});
