import { Euler, Matrix4, MathUtils } from 'three';

import type { TrackingSnapshot } from '../tracking/types';
import type { AvatarPose } from './types';
import { NEUTRAL_POSE } from './types';

const FACE_HOLD_MS = 300;
const RECOVERY_TIME_MS = 180;
const FACE_REFERENCE_WIDTH = 0.25;
const SHOULDER_REFERENCE_WIDTH = 0.45;
const MIN_AVATAR_SCALE = 0.6;
const MAX_AVATAR_SCALE = 1.2;

export class MotionMapper {
  private pose: AvatarPose = structuredClone(NEUTRAL_POSE);
  private lastUpdateMs: number | null = null;
  private lastFaceMs = Number.NEGATIVE_INFINITY;
  private initialized = false;

  update(snapshot: TrackingSnapshot, nowMs: number, mirrored = true): AvatarPose {
    const deltaMs = this.lastUpdateMs === null ? 0 : Math.max(0, nowMs - this.lastUpdateMs);
    this.lastUpdateMs = nowMs;
    const target = this.targetPose(snapshot, nowMs, mirrored);

    if (!this.initialized && snapshot.face) {
      this.pose = target;
      this.initialized = true;
    } else {
      const amount = deltaMs === 0 ? 1 : 1 - Math.exp(-deltaMs / RECOVERY_TIME_MS);
      this.pose = interpolatePose(this.pose, target, amount);
    }
    this.pose.breath = Math.sin(nowMs / 900);
    return structuredClone(this.pose);
  }

  reset(): void {
    this.pose = structuredClone(NEUTRAL_POSE);
    this.lastUpdateMs = null;
    this.lastFaceMs = Number.NEGATIVE_INFINITY;
    this.initialized = false;
  }

  private targetPose(snapshot: TrackingSnapshot, nowMs: number, mirrored: boolean): AvatarPose {
    const target = structuredClone(NEUTRAL_POSE);
    let faceDistanceScale: number | null = null;
    if (snapshot.face) {
      this.lastFaceMs = nowMs;
      const shape = (name: string) => clamp01(snapshot.face?.blendshapes[name] ?? 0);
      target.blinkLeft = shape('eyeBlinkLeft');
      target.blinkRight = shape('eyeBlinkRight');
      target.mouthOpen = shape('jawOpen');
      target.smile = (shape('mouthSmileLeft') + shape('mouthSmileRight')) / 2;
      target.browRaise = shape('browInnerUp');
      target.browFrown = (shape('browDownLeft') + shape('browDownRight')) / 2;
      const gazeX = clamp(
        shape('eyeLookOutLeft') - shape('eyeLookInLeft') +
          shape('eyeLookInRight') - shape('eyeLookOutRight'),
        -1,
        1,
      );
      target.gazeX = mirrored ? -gazeX : gazeX;
      target.gazeY = clamp(
        (shape('eyeLookUpLeft') + shape('eyeLookUpRight')) / 2 -
          (shape('eyeLookDownLeft') + shape('eyeLookDownRight')) / 2,
        -1,
        1,
      );
      target.head = matrixRotation(snapshot.face.transformationMatrix, mirrored);
      const bounds = landmarkBounds(snapshot.face.landmarks);
      if (bounds) {
        const centerX = (bounds.left + bounds.right) / 2;
        const centerY = (bounds.top + bounds.bottom) / 2;
        const displayedX = mirrored ? 1 - centerX : centerX;
        target.anchorX = clamp((displayedX - 0.5) * 3.4, -1.7, 1.7);
        target.anchorY = clamp((0.34 - centerY) * 3, -0.8, 0.8);
        faceDistanceScale = clamp(
          (bounds.right - bounds.left) / FACE_REFERENCE_WIDTH,
          MIN_AVATAR_SCALE,
          MAX_AVATAR_SCALE,
        );
        target.avatarScale = faceDistanceScale;
      }
      target.faceTracked = true;
    } else if (nowMs - this.lastFaceMs <= FACE_HOLD_MS) {
      target.head = { ...this.pose.head };
      target.blinkLeft = this.pose.blinkLeft;
      target.blinkRight = this.pose.blinkRight;
      target.gazeX = this.pose.gazeX;
      target.gazeY = this.pose.gazeY;
      target.mouthOpen = this.pose.mouthOpen;
      target.smile = this.pose.smile;
      target.browRaise = this.pose.browRaise;
      target.browFrown = this.pose.browFrown;
    }

    const leftShoulder = snapshot.pose?.landmarks[11];
    const rightShoulder = snapshot.pose?.landmarks[12];
    if (leftShoulder && rightShoulder) {
      const displayed = [leftShoulder, rightShoulder]
        .map((point) => ({ x: mirrored ? 1 - point.x : point.x, y: point.y }))
        .sort((left, right) => left.x - right.x);
      const screenLeft = displayed[0]!;
      const screenRight = displayed[1]!;
      target.torsoRoll = clamp(
        Math.atan2(screenRight.y - screenLeft.y, screenRight.x - screenLeft.x),
        -0.35,
        0.35,
      );
      const shoulderCenter = (screenLeft.x + screenRight.x) / 2;
      target.torsoX = clamp((shoulderCenter - 0.5) * 1.5, -0.4, 0.4);
      if (!snapshot.face?.landmarks.length) target.anchorX = target.torsoX * 2.25;
      const shoulderDistanceScale = clamp(
        Math.abs(screenRight.x - screenLeft.x) / SHOULDER_REFERENCE_WIDTH,
        MIN_AVATAR_SCALE,
        MAX_AVATAR_SCALE,
      );
      target.avatarScale = faceDistanceScale === null
        ? shoulderDistanceScale
        : MathUtils.lerp(faceDistanceScale, shoulderDistanceScale, 0.2);
      target.shoulderLift = clamp(0.55 - (leftShoulder.y + rightShoulder.y) / 2, -0.2, 0.2);
      target.poseTracked = true;
    }
    return target;
  }
}

function matrixRotation(values: number[] | undefined, mirrored: boolean): AvatarPose['head'] {
  if (!values || values.length !== 16) return { x: 0, y: 0, z: 0 };
  const euler = new Euler().setFromRotationMatrix(new Matrix4().fromArray(values), 'YXZ');
  const rotation = {
    x: clamp(euler.x, -MathUtils.degToRad(30), MathUtils.degToRad(30)),
    y: clamp(euler.y, -MathUtils.degToRad(45), MathUtils.degToRad(45)),
    z: clamp(euler.z, -MathUtils.degToRad(25), MathUtils.degToRad(25)),
  };
  return mirrored ? { x: rotation.x, y: -rotation.y, z: -rotation.z } : rotation;
}

function landmarkBounds(landmarks: Array<{ x: number; y: number }>) {
  if (landmarks.length === 0) return null;
  let left = 1;
  let right = 0;
  let top = 1;
  let bottom = 0;
  for (const point of landmarks) {
    left = Math.min(left, point.x);
    right = Math.max(right, point.x);
    top = Math.min(top, point.y);
    bottom = Math.max(bottom, point.y);
  }
  return { left, right, top, bottom };
}

function interpolatePose(previous: AvatarPose, target: AvatarPose, amount: number): AvatarPose {
  const mix = (from: number, to: number) => MathUtils.lerp(from, to, amount);
  return {
    head: {
      x: mix(previous.head.x, target.head.x),
      y: mix(previous.head.y, target.head.y),
      z: mix(previous.head.z, target.head.z),
    },
    blinkLeft: mix(previous.blinkLeft, target.blinkLeft),
    blinkRight: mix(previous.blinkRight, target.blinkRight),
    gazeX: mix(previous.gazeX, target.gazeX),
    gazeY: mix(previous.gazeY, target.gazeY),
    mouthOpen: mix(previous.mouthOpen, target.mouthOpen),
    smile: mix(previous.smile, target.smile),
    browRaise: mix(previous.browRaise, target.browRaise),
    browFrown: mix(previous.browFrown, target.browFrown),
    torsoRoll: mix(previous.torsoRoll, target.torsoRoll),
    torsoX: mix(previous.torsoX, target.torsoX),
    anchorX: mix(previous.anchorX, target.anchorX),
    anchorY: mix(previous.anchorY, target.anchorY),
    avatarScale: mix(previous.avatarScale, target.avatarScale),
    shoulderLift: mix(previous.shoulderLift, target.shoulderLift),
    breath: target.breath,
    faceTracked: target.faceTracked,
    poseTracked: target.poseTracked,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}
