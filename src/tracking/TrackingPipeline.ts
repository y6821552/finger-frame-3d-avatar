import {
  FaceLandmarker,
  FilesetResolver,
  HandLandmarker,
  PoseLandmarker,
  type Category,
  type FaceLandmarkerResult,
  type HandLandmarkerResult,
  type ImageSource,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';

import type {
  FaceObservation,
  HandObservation,
  PoseObservation,
  TrackingSnapshot,
  TrackingSource,
} from './types';

interface ClosableTracker<T> {
  detectForVideo(source: ImageSource, nowMs: number): T;
  close(): void;
}

export interface RawTrackers {
  hands: ClosableTracker<Pick<HandLandmarkerResult, 'landmarks' | 'handedness'>>;
  face: ClosableTracker<Pick<FaceLandmarkerResult, 'faceLandmarks' | 'faceBlendshapes' | 'facialTransformationMatrixes'>>;
  pose: ClosableTracker<Pick<PoseLandmarkerResult, 'landmarks' | 'worldLandmarks'>>;
}

export interface TrackingCadence {
  handMs: number;
  faceMs: number;
  poseMs: number;
}

const DEFAULT_CADENCE: TrackingCadence = { handMs: 40, faceMs: 50, poseMs: 85 };

export class TrackingPipeline implements TrackingSource {
  readonly mode = 'staggered-main-thread';
  private video: HTMLVideoElement | null = null;
  private suspended = false;
  private stopped = false;
  private nextHandMs = Number.NEGATIVE_INFINITY;
  private nextFaceMs = Number.NEGATIVE_INFINITY;
  private nextPoseMs = Number.NEGATIVE_INFINITY;
  private latest: TrackingSnapshot = { timestampMs: 0, hands: [], face: null, pose: null };

  constructor(
    private readonly trackers: RawTrackers,
    private readonly cadence: TrackingCadence = DEFAULT_CADENCE,
  ) {}

  static async create(): Promise<TrackingPipeline> {
    return new TrackingPipeline(await createRawTrackers(import.meta.env.BASE_URL));
  }

  async start(video: HTMLVideoElement): Promise<void> {
    this.video = video;
    this.stopped = false;
    this.nextHandMs = Number.NEGATIVE_INFINITY;
    this.nextFaceMs = Number.NEGATIVE_INFINITY;
    this.nextPoseMs = Number.NEGATIVE_INFINITY;
    await Promise.resolve();
  }

  async sample(nowMs: number): Promise<TrackingSnapshot> {
    const video = this.video;
    if (!video || this.suspended || this.stopped) return structuredClone(this.latest);
    let hands = this.latest.hands;
    let face = this.latest.face;
    let pose = this.latest.pose;

    if (nowMs >= this.nextHandMs) {
      hands = convertHands(this.trackers.hands.detectForVideo(video, nowMs));
      this.nextHandMs = nowMs + this.cadence.handMs;
    }
    if (nowMs >= this.nextFaceMs) {
      face = convertFace(this.trackers.face.detectForVideo(video, nowMs));
      this.nextFaceMs = nowMs + this.cadence.faceMs;
    }
    if (nowMs >= this.nextPoseMs) {
      pose = convertPose(this.trackers.pose.detectForVideo(video, nowMs));
      this.nextPoseMs = nowMs + this.cadence.poseMs;
    }
    this.latest = { timestampMs: nowMs, hands, face, pose };
    return structuredClone(this.latest);
  }

  setSuspended(suspended: boolean): void {
    this.suspended = suspended;
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.video = null;
    this.trackers.hands.close();
    this.trackers.face.close();
    this.trackers.pose.close();
  }
}

export async function createRawTrackers(base: string): Promise<RawTrackers> {
  const fileset = await FilesetResolver.forVisionTasks(`${base}wasm`);
  const [hands, face, pose] = await Promise.all([
    createHandTracker(fileset, `${base}models/hand_landmarker.task`),
    createFaceTracker(fileset, `${base}models/face_landmarker.task`),
    createPoseTracker(fileset, `${base}models/pose_landmarker_lite.task`),
  ]);
  return { hands, face, pose };
}

async function createHandTracker(fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>, path: string) {
  return createWithDelegate((delegate) => HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: path, delegate },
    runningMode: 'VIDEO',
    numHands: 2,
    minHandDetectionConfidence: 0.3,
    minHandPresenceConfidence: 0.3,
    minTrackingConfidence: 0.3,
  }));
}

async function createFaceTracker(fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>, path: string) {
  return createWithDelegate((delegate) => FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: path, delegate },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
    minFaceDetectionConfidence: 0.35,
    minFacePresenceConfidence: 0.35,
    minTrackingConfidence: 0.35,
  }));
}

async function createPoseTracker(fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>, path: string) {
  return createWithDelegate((delegate) => PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: path, delegate },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.35,
    minPosePresenceConfidence: 0.35,
    minTrackingConfidence: 0.35,
    outputSegmentationMasks: false,
  }));
}

async function createWithDelegate<T>(factory: (delegate: 'GPU' | 'CPU') => Promise<T>): Promise<T> {
  try {
    return await factory('GPU');
  } catch {
    return factory('CPU');
  }
}

export function convertHands(result: Pick<HandLandmarkerResult, 'landmarks' | 'handedness'>): HandObservation[] {
  return result.landmarks.map((landmarks, index) => {
    const category = result.handedness[index]?.[0];
    const handedness = normalizeHandedness(category);
    return {
      landmarks: landmarks.map(copyLandmark),
      ...(handedness ? { handedness } : {}),
      ...(category ? { score: category.score } : {}),
    };
  });
}

export function convertFace(
  result: Pick<FaceLandmarkerResult, 'faceLandmarks' | 'faceBlendshapes' | 'facialTransformationMatrixes'>,
): FaceObservation | null {
  const landmarks = result.faceLandmarks[0];
  if (!landmarks) return null;
  const blendshapes = Object.fromEntries(
    (result.faceBlendshapes[0]?.categories ?? []).map((category) => [category.categoryName, category.score]),
  );
  const matrix = result.facialTransformationMatrixes[0]?.data;
  return {
    landmarks: landmarks.map(copyLandmark),
    blendshapes,
    ...(matrix ? { transformationMatrix: [...matrix] } : {}),
  };
}

export function convertPose(result: Pick<PoseLandmarkerResult, 'landmarks' | 'worldLandmarks'>): PoseObservation | null {
  const landmarks = result.landmarks[0];
  if (!landmarks) return null;
  const world = result.worldLandmarks[0];
  return {
    landmarks: landmarks.map(copyLandmark),
    ...(world ? { worldLandmarks: world.map(copyLandmark) } : {}),
  };
}

function normalizeHandedness(category: Category | undefined): 'Left' | 'Right' | undefined {
  if (category?.categoryName === 'Left' || category?.categoryName === 'Right') {
    return category.categoryName;
  }
  return undefined;
}

function copyLandmark(landmark: { x: number; y: number; z?: number; visibility?: number }) {
  return {
    x: landmark.x,
    y: landmark.y,
    ...(landmark.z === undefined ? {} : { z: landmark.z }),
    ...(landmark.visibility === undefined ? {} : { visibility: landmark.visibility }),
  };
}
