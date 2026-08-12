export interface Rotation3 {
  x: number;
  y: number;
  z: number;
}

export interface AvatarPose {
  head: Rotation3;
  blinkLeft: number;
  blinkRight: number;
  gazeX: number;
  gazeY: number;
  mouthOpen: number;
  smile: number;
  browRaise: number;
  browFrown: number;
  torsoRoll: number;
  torsoX: number;
  anchorX: number;
  anchorY: number;
  avatarScale: number;
  shoulderLift: number;
  breath: number;
  faceTracked: boolean;
  poseTracked: boolean;
}

export const NEUTRAL_POSE: AvatarPose = {
  head: { x: 0, y: 0, z: 0 },
  blinkLeft: 0,
  blinkRight: 0,
  gazeX: 0,
  gazeY: 0,
  mouthOpen: 0,
  smile: 0,
  browRaise: 0,
  browFrown: 0,
  torsoRoll: 0,
  torsoX: 0,
  anchorX: 0,
  anchorY: 0,
  avatarScale: 1,
  shoulderLift: 0,
  breath: 0,
  faceTracked: false,
  poseTracked: false,
};
