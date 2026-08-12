// @vitest-environment node
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { MODELS, prepareRuntimeAssets } from '../scripts/prepare-runtime-assets.mjs';

describe('runtime asset bootstrap', () => {
  it('uses the published MediaPipe Lite pose model URL', () => {
    const pose = MODELS.find((model) => model.filename === 'pose_landmarker_lite.task');
    expect(pose?.url).toMatch(/\/pose_landmarker_lite\.task$/);
  });

  it('downloads verified models, copies packaged WASM, and reuses valid files', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'finger-frame-assets-'));
    const wasmSourceDir = join(rootDir, 'package-wasm');
    await mkdir(wasmSourceDir, { recursive: true });
    await writeFile(join(wasmSourceDir, 'runtime.js'), 'runtime-js');
    await writeFile(join(wasmSourceDir, 'runtime.wasm'), 'runtime-wasm');
    const modelBytes = new TextEncoder().encode('model-data');
    const sha256 = createHash('sha256').update(modelBytes).digest('hex');
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => modelBytes.buffer,
    }));
    const options = {
      rootDir,
      wasmSourceDir,
      models: [{ filename: 'model.task', url: 'https://models.example/model.task', sha256 }],
      wasmFiles: ['runtime.js', 'runtime.wasm'],
      fetchImpl,
      log: vi.fn(),
    };

    const first = await prepareRuntimeAssets(options);
    expect(first).toEqual({ downloaded: 1, copied: 2 });
    expect(await readFile(join(rootDir, 'public/models/model.task'), 'utf8')).toBe('model-data');
    expect(await readFile(join(rootDir, 'public/wasm/runtime.wasm'), 'utf8')).toBe('runtime-wasm');

    const second = await prepareRuntimeAssets(options);
    expect(second).toEqual({ downloaded: 0, copied: 0 });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
