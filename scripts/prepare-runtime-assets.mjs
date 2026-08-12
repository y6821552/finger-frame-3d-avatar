/* global console, fetch, process */

import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const MODELS = [
  {
    filename: 'hand_landmarker.task',
    url: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
    sha256: 'fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1',
  },
  {
    filename: 'face_landmarker.task',
    url: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
    sha256: '64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff',
  },
  {
    filename: 'pose_landmarker_lite.task',
    url: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
    sha256: '59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a',
  },
];

export const WASM_FILES = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_module_internal.js',
  'vision_wasm_module_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
];

export async function prepareRuntimeAssets({
  rootDir,
  wasmSourceDir,
  models = MODELS,
  wasmFiles = WASM_FILES,
  fetchImpl = fetch,
  log = console.log,
}) {
  const modelDir = join(rootDir, 'public/models');
  const wasmDir = join(rootDir, 'public/wasm');
  await mkdir(modelDir, { recursive: true });
  await mkdir(wasmDir, { recursive: true });
  let downloaded = 0;
  let copied = 0;

  for (const model of models) {
    const destination = join(modelDir, model.filename);
    if (await hasHash(destination, model.sha256)) continue;
    const response = await fetchImpl(model.url);
    if (!response.ok) throw new Error(`Failed to download ${model.url}: HTTP ${response.status ?? 'unknown'}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const actualHash = hash(bytes);
    if (actualHash !== model.sha256) {
      throw new Error(`SHA-256 mismatch for ${model.filename}: expected ${model.sha256}, received ${actualHash}`);
    }
    const temporary = `${destination}.download-${process.pid}`;
    try {
      await writeFile(temporary, bytes);
      await rename(temporary, destination);
    } finally {
      await rm(temporary, { force: true });
    }
    downloaded += 1;
    log(`Downloaded verified model: ${model.filename}`);
  }

  for (const filename of wasmFiles) {
    const source = join(wasmSourceDir, filename);
    const destination = join(wasmDir, filename);
    const sourceHash = await fileHash(source);
    if (await hasHash(destination, sourceHash)) continue;
    await copyFile(source, destination);
    copied += 1;
    log(`Copied MediaPipe runtime: ${filename}`);
  }

  return { downloaded, copied };
}

async function hasHash(filename, expectedHash) {
  try {
    return await fileHash(filename) === expectedHash;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return false;
    throw error;
  }
}

async function fileHash(filename) {
  return hash(await readFile(filename));
}

function hash(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const rootDir = resolve(dirname(scriptPath), '..');
  const wasmSourceDir = join(rootDir, 'node_modules/@mediapipe/tasks-vision/wasm');
  await prepareRuntimeAssets({ rootDir, wasmSourceDir });
}
