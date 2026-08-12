/// <reference lib="webworker" />

import type { ImageSource } from '@mediapipe/tasks-vision';

import { convertFace, convertHands, convertPose, createRawTrackers, type RawTrackers } from './TrackingPipeline';
import type { TrackingSnapshot } from './types';

declare const self: DedicatedWorkerGlobalScope;

type WorkerRequest =
  | { type: 'init'; assetBase: string }
  | { type: 'frame'; frame: ImageBitmap; timestampMs: number }
  | { type: 'stop' };

let trackers: RawTrackers | null = null;
let latest: TrackingSnapshot = { timestampMs: 0, hands: [], face: null, pose: null };
let nextHandMs = Number.NEGATIVE_INFINITY;
let nextFaceMs = Number.NEGATIVE_INFINITY;
let nextPoseMs = Number.NEGATIVE_INFINITY;

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  void handle(event.data);
});

async function handle(request: WorkerRequest): Promise<void> {
  try {
    if (request.type === 'init') {
      trackers = await createRawTrackers(request.assetBase);
      self.postMessage({ type: 'ready' });
      return;
    }
    if (request.type === 'stop') {
      closeTrackers();
      self.close();
      return;
    }
    if (!trackers) throw new Error('Tracking worker is not initialized');
    const frame = request.frame as ImageSource;
    let { hands, face, pose } = latest;
    if (request.timestampMs >= nextHandMs) {
      hands = convertHands(trackers.hands.detectForVideo(frame, request.timestampMs));
      nextHandMs = request.timestampMs + 40;
    }
    if (request.timestampMs >= nextFaceMs) {
      face = convertFace(trackers.face.detectForVideo(frame, request.timestampMs));
      nextFaceMs = request.timestampMs + 50;
    }
    if (request.timestampMs >= nextPoseMs) {
      pose = convertPose(trackers.pose.detectForVideo(frame, request.timestampMs));
      nextPoseMs = request.timestampMs + 85;
    }
    request.frame.close();
    latest = { timestampMs: request.timestampMs, hands, face, pose };
    self.postMessage({ type: 'result', snapshot: latest });
  } catch (error) {
    if (request.type === 'frame') request.frame.close();
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
}

function closeTrackers(): void {
  trackers?.hands.close();
  trackers?.face.close();
  trackers?.pose.close();
  trackers = null;
}
