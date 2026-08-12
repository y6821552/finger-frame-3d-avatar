import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';
import { Group, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import type { AvatarPose } from '../motion/types';
import type { Avatar } from './Avatar';
import type { AvatarRole } from './roles';

export class VrmAvatar implements Avatar {
  readonly kind = 'vrm' as const;
  readonly object3d: Object3D;

  constructor(readonly role: AvatarRole, private readonly vrm: VRM) {
    this.object3d = new Group();
    this.object3d.name = 'avatar-root';
    this.object3d.add(vrm.scene);
    vrm.scene.rotation.y = Math.PI;
    vrm.scene.position.y = -1.35;
  }

  applyPose(pose: AvatarPose): void {
    setBone(this.vrm, 'head', pose.head.x, pose.head.y, pose.head.z);
    setBone(this.vrm, 'neck', pose.head.x * 0.18, pose.head.y * 0.24, pose.head.z * 0.24);
    setBone(this.vrm, 'chest', 0, 0, pose.torsoRoll * 0.65);
    this.object3d.position.set(pose.anchorX, pose.anchorY, 0);
    this.object3d.scale.setScalar(pose.avatarScale);
    const expressions = this.vrm.expressionManager;
    expressions?.setValue('blinkLeft', pose.blinkLeft);
    expressions?.setValue('blinkRight', pose.blinkRight);
    expressions?.setValue('aa', pose.mouthOpen);
    expressions?.setValue('happy', pose.smile);
    expressions?.setValue('lookLeft', Math.max(0, -pose.gazeX));
    expressions?.setValue('lookRight', Math.max(0, pose.gazeX));
    expressions?.setValue('lookUp', Math.max(0, pose.gazeY));
    expressions?.setValue('lookDown', Math.max(0, -pose.gazeY));
    this.vrm.update(1 / 60);
  }

  dispose(): void {
    VRMUtils.deepDispose(this.vrm.scene);
    this.object3d.clear();
  }
}

export async function loadVrmAvatar(role: AvatarRole): Promise<VrmAvatar> {
  if (!role.vrm || !role.vrm.redistribution || !role.vrm.modification) {
    throw new Error(`Role ${role.id} has no redistributable VRM asset`);
  }
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const gltf = await loader.loadAsync(role.vrm.url);
  const vrm = gltf.userData.vrm as VRM | undefined;
  if (!vrm) throw new Error(`Asset for ${role.id} is not a valid VRM`);
  VRMUtils.removeUnnecessaryVertices(vrm.scene);
  VRMUtils.combineSkeletons(vrm.scene);
  return new VrmAvatar(role, vrm);
}

function setBone(vrm: VRM, name: 'head' | 'neck' | 'chest', x: number, y: number, z: number) {
  const bone = vrm.humanoid.getNormalizedBoneNode(name);
  bone?.rotation.set(x, y, z);
}
