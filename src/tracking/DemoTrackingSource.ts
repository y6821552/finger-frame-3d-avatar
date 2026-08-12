import type { HandObservation, Landmark, TrackingSnapshot, TrackingSource } from './types';

export class DemoTrackingSource implements TrackingSource {
  readonly mode = 'deterministic-demo';
  private suspended = false;

  async start(video: HTMLVideoElement): Promise<void> {
    void video;
    await Promise.resolve();
  }

  async sample(nowMs: number): Promise<TrackingSnapshot> {
    if (this.suspended) return { timestampMs: nowMs, hands: [], face: null, pose: null };
    const seconds = nowMs / 1_000;
    const drift = Math.sin(seconds * 0.75) * 0.025;
    const jawOpen = 0.12 + (Math.sin(seconds * 2.2) + 1) * 0.22;
    const blink = Math.pow(Math.max(0, Math.sin(seconds * 3.1)), 14);
    const shoulders = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.58, z: 0 }));
    shoulders[11] = { x: 0.37 + drift, y: 0.56 + Math.sin(seconds) * 0.012, z: 0 };
    shoulders[12] = { x: 0.63 + drift, y: 0.56 - Math.sin(seconds) * 0.012, z: 0 };
    const yaw = Math.sin(seconds * 0.8) * 0.28;
    const cosine = Math.cos(yaw);
    const sine = Math.sin(yaw);
    const faceLandmarks = Array.from({ length: 478 }, (_, index) => ({
      x: 0.5 + Math.cos(index * 0.17) * 0.12 + drift,
      y: 0.45 + Math.sin(index * 0.17) * 0.16,
      z: 0,
    }));
    faceLandmarks[234] = { x: 0.38 + drift, y: 0.45, z: 0 };
    faceLandmarks[454] = { x: 0.62 + drift, y: 0.45, z: 0 };
    faceLandmarks[10] = { x: 0.5 + drift, y: 0.29, z: 0 };
    faceLandmarks[152] = { x: 0.5 + drift, y: 0.61, z: 0 };
    return {
      timestampMs: nowMs,
      hands: [demoHand('Left', 0.22 + drift, seconds), demoHand('Right', 0.78 + drift, seconds)],
      face: {
        landmarks: faceLandmarks,
        blendshapes: {
          eyeBlinkLeft: blink,
          eyeBlinkRight: blink * 0.96,
          jawOpen,
          mouthSmileLeft: 0.28 + Math.sin(seconds * 0.6) * 0.12,
          mouthSmileRight: 0.28 + Math.sin(seconds * 0.6) * 0.12,
          browInnerUp: 0.18 + Math.sin(seconds * 1.3) * 0.08,
        },
        transformationMatrix: [
          cosine, 0, -sine, 0,
          0, 1, 0, 0,
          sine, 0, cosine, 0,
          0, 0, 0, 1,
        ],
      },
      pose: { landmarks: shoulders },
    };
  }

  setSuspended(suspended: boolean): void {
    this.suspended = suspended;
  }

  stop(): void {
    this.suspended = true;
  }
}

function demoHand(side: 'Left' | 'Right', screenX: number, seconds: number): HandObservation {
  const hand: Landmark[] = Array.from({ length: 21 }, () => ({ x: 1 - screenX, y: 0.62, z: 0 }));
  const outer = side === 'Left' ? screenX - 0.05 : screenX + 0.05;
  const wave = Math.sin(seconds * 0.9 + (side === 'Left' ? 0 : 0.4)) * 0.012;
  putScreen(hand, 0, screenX, 0.72 + wave);
  putScreen(hand, 9, screenX, 0.58 + wave);
  putScreen(hand, 8, outer, 0.2 + wave);
  putScreen(hand, 4, outer, 0.61 + wave);
  for (const [index, amount] of [[5, 0.52], [6, 0.42], [7, 0.31]] as const) {
    putScreen(hand, index, screenX + (outer - screenX) * amount, 0.58 - amount * 0.46 + wave);
  }
  for (const [index, amount] of [[1, 0.25], [2, 0.5], [3, 0.75]] as const) {
    putScreen(hand, index, screenX + (outer - screenX) * amount, 0.68 - amount * 0.07 + wave);
  }
  return { landmarks: hand, handedness: side, score: 1 };
}

function putScreen(landmarks: Landmark[], index: number, screenX: number, y: number): void {
  landmarks[index] = { x: 1 - screenX, y, z: 0 };
}
