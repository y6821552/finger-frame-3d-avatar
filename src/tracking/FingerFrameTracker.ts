import type { HandObservation, Point, Quad, Size } from './types';

const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;

export interface FingerFrameState {
  quad: Quad | null;
  opacity: number;
  hands: HandObservation[];
  active: boolean;
}

export interface FingerFrameTrackerOptions {
  maxLostFrames?: number;
  jumpConfirmFrames?: number;
  handCacheMs?: number;
}

interface HandFramePoints {
  index: Point;
  thumb: Point;
  wristX: number;
  scale: number;
}

export class FingerFrameTracker {
  private quad: Quad | null = null;
  private opacity = 0;
  private frameActive = false;
  private lostFrames = 0;
  private jumpFrames = 0;
  private readonly maxLostFrames: number;
  private readonly jumpConfirmFrames: number;
  private readonly handCacheMs: number;
  private readonly handCache = new Map<'Left' | 'Right', { hand: HandObservation; at: number }>();

  constructor(options: FingerFrameTrackerOptions = {}) {
    this.maxLostFrames = options.maxLostFrames ?? 25;
    this.jumpConfirmFrames = options.jumpConfirmFrames ?? 2;
    this.handCacheMs = options.handCacheMs ?? 220;
  }

  update(hands: HandObservation[], viewport: Size, nowMs: number, mirrored = true): FingerFrameState {
    for (const hand of hands) {
      if (hand.handedness) this.handCache.set(hand.handedness, { hand, at: nowMs });
    }
    for (const [side, cached] of this.handCache) {
      if (nowMs - cached.at > this.handCacheMs) this.handCache.delete(side);
    }
    const cachedPair = [...this.handCache.values()].map((entry) => entry.hand);
    const candidates = hands.length === 2 ? hands : cachedPair.length === 2 ? cachedPair : [];
    const target = candidates.length === 2 ? this.computeQuad(candidates, viewport, mirrored) : null;

    if (target) {
      if (!this.quad) {
        this.lostFrames = 0;
        this.frameActive = true;
        this.jumpFrames = 0;
        this.quad = target;
        this.opacity = Math.min(1, this.opacity + 0.12);
      } else {
        const moved = averageDistance(target, this.quad);
        if (moved > viewport.width * 0.3 && ++this.jumpFrames < this.jumpConfirmFrames) {
          if (++this.lostFrames > this.maxLostFrames) {
            this.opacity = Math.max(0, this.opacity - 0.05);
          }
        } else {
          this.lostFrames = 0;
          this.frameActive = true;
          this.jumpFrames = 0;
          const alpha = Math.min(0.85, Math.max(0.35, moved / (viewport.width * 0.05)));
          this.quad = this.quad.map((point, index) =>
            lerpPoint(point, target[index] as Point, alpha),
          ) as Quad;
          this.opacity = Math.min(1, this.opacity + 0.12);
        }
      }
    } else if (this.quad && ++this.lostFrames <= this.maxLostFrames) {
      this.opacity = Math.min(1, this.opacity + 0.12);
    } else {
      this.opacity = Math.max(0, this.opacity - 0.05);
      if (this.opacity === 0) {
        this.quad = null;
        this.frameActive = false;
        this.jumpFrames = 0;
      }
    }

    return {
      quad: this.quad ? cloneQuad(this.quad) : null,
      opacity: this.opacity,
      hands,
      active: this.frameActive,
    };
  }

  reset(): void {
    this.quad = null;
    this.opacity = 0;
    this.frameActive = false;
    this.lostFrames = 0;
    this.jumpFrames = 0;
    this.handCache.clear();
  }

  private computeQuad(hands: HandObservation[], viewport: Size, mirrored: boolean): Quad | null {
    const info = hands.map(({ landmarks }) => {
      const index = toPixel(requireLandmark(landmarks, INDEX_TIP), viewport, mirrored);
      const thumb = toPixel(requireLandmark(landmarks, THUMB_TIP), viewport, mirrored);
      const wrist = toPixel(requireLandmark(landmarks, WRIST), viewport, mirrored);
      const middleMcp = toPixel(requireLandmark(landmarks, MIDDLE_MCP), viewport, mirrored);
      return {
        index,
        thumb,
        wristX: wrist.x,
        scale: distance(wrist, middleMcp) + 1,
      } satisfies HandFramePoints;
    });

    const needed = this.frameActive ? 0.2 : 0.75;
    if (info.some((hand) => distance(hand.thumb, hand.index) < hand.scale * needed)) {
      return null;
    }

    info.sort((left, right) => left.wristX - right.wristX);
    const left = info[0];
    const right = info[1];
    if (!left || !right) return null;
    const points: Quad = [left.index, right.index, right.thumb, left.thumb];
    const center = points.reduce(
      (sum, point) => ({ x: sum.x + point.x / 4, y: sum.y + point.y / 4 }),
      { x: 0, y: 0 },
    );
    const hull = [...points].sort(
      (a, b) =>
        Math.atan2(a.y - center.y, a.x - center.x) -
        Math.atan2(b.y - center.y, b.x - center.x),
    );
    const minArea = this.frameActive ? 0.0005 : 0.005;
    if (polygonArea(hull) < viewport.width * viewport.height * minArea) return null;
    return points;
  }
}

function requireLandmark(landmarks: HandObservation['landmarks'], index: number) {
  const landmark = landmarks[index];
  if (!landmark) throw new Error(`Hand observation is missing landmark ${index}`);
  return landmark;
}

function toPixel(landmark: { x: number; y: number }, viewport: Size, mirrored: boolean): Point {
  return {
    x: Math.round((mirrored ? 1 - landmark.x : landmark.x) * viewport.width * 1_000) / 1_000,
    y: Math.round(landmark.y * viewport.height * 1_000) / 1_000,
  };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function averageDistance(a: Quad, b: Quad): number {
  return a.reduce((sum, point, index) => sum + distance(point, b[index] as Point), 0) / 4;
}

function lerpPoint(a: Point, b: Point, amount: number): Point {
  return { x: a.x + (b.x - a.x) * amount, y: a.y + (b.y - a.y) * amount };
}

function polygonArea(points: Point[]): number {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const next = points[(index + 1) % points.length];
    if (point && next) area += point.x * next.y - next.x * point.y;
  }
  return Math.abs(area / 2);
}

function cloneQuad(quad: Quad): Quad {
  return quad.map((point) => ({ ...point })) as Quad;
}
