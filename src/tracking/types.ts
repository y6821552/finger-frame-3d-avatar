export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface Point {
  x: number;
  y: number;
}

export type Quad = [Point, Point, Point, Point];

export interface Size {
  width: number;
  height: number;
}

export interface HandObservation {
  landmarks: Landmark[];
  handedness?: 'Left' | 'Right';
  score?: number;
}

export interface FaceObservation {
  landmarks: Landmark[];
  blendshapes: Record<string, number>;
  transformationMatrix?: number[];
}

export interface PoseObservation {
  landmarks: Landmark[];
  worldLandmarks?: Landmark[];
}

export interface TrackingSnapshot {
  timestampMs: number;
  hands: HandObservation[];
  face: FaceObservation | null;
  pose: PoseObservation | null;
}

export interface TrackingSource {
  readonly mode: string;
  start(video: HTMLVideoElement): Promise<void>;
  sample(nowMs: number): Promise<TrackingSnapshot>;
  setSuspended(suspended: boolean): void;
  stop(): void;
}
