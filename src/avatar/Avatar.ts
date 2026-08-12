import type { Object3D } from 'three';

import type { AvatarPose } from '../motion/types';
import type { AvatarRole } from './roles';

export interface Avatar {
  readonly kind: 'procedural' | 'vrm';
  readonly role: AvatarRole;
  readonly object3d: Object3D;
  applyPose(pose: AvatarPose): void;
  dispose(): void;
}
