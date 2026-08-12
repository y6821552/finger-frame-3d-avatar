import { Mesh, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';

import { ProceduralAvatar } from './ProceduralAvatar';
import { roleById } from './roles';
import type { AvatarPose } from '../motion/types';

const POSE: AvatarPose = {
  head: { x: 0.1, y: 0.25, z: -0.08 },
  blinkLeft: 0.8,
  blinkRight: 0.2,
  gazeX: 0.3,
  gazeY: -0.2,
  mouthOpen: 0.7,
  smile: 0.4,
  browRaise: 0.3,
  browFrown: 0.1,
  anchorX: 0.2,
  anchorY: 0.15,
  avatarScale: 1.1,
  torsoRoll: 0.12,
  torsoX: 0.15,
  shoulderLift: 0.05,
  breath: 0.5,
  faceTracked: true,
  poseTracked: true,
};

describe('ProceduralAvatar', () => {
  it('builds every animated facial and torso node', () => {
    const avatar = new ProceduralAvatar(roleById('adult-female'));

    for (const name of [
      'avatar-torso', 'avatar-head', 'eye-left', 'eye-right', 'lid-left', 'lid-right',
      'brow-left', 'brow-right', 'avatar-mouth', 'avatar-hair', 'pupil-left',
      'pupil-right', 'upper-lip', 'lower-lip', 'mouth-teeth', 'cheek-left',
      'cheek-right', 'hair-back-volume', 'hair-side-left', 'hair-side-right',
      'outfit-body', 'outfit-collar',
    ]) {
      expect(avatar.object3d.getObjectByName(name), name).toBeTruthy();
    }
  });

  it('uses smooth cinematic geometry instead of cone-lock toy hair', () => {
    const avatar = new ProceduralAvatar(roleById('adult-female'));
    const hair = avatar.object3d.getObjectByName('avatar-hair');

    expect(hair?.getObjectByName('hair-back-volume')).toBeTruthy();
    expect(hair?.getObjectByName('hair-fringe-0')).toBeTruthy();
    expect(hair?.children.some((child) => child.type === 'Mesh' && child.name.includes('cone')))
      .toBe(false);
  });

  it('keeps adult facial features refined and the back hair behind the face', () => {
    const avatar = new ProceduralAvatar(roleById('adult-female'));
    const leftEye = avatar.object3d.getObjectByName('eye-left')!;
    const backHair = avatar.object3d.getObjectByName('hair-back-volume')!;
    const nose = avatar.object3d.getObjectByName('avatar-nose')!;

    expect(leftEye.scale.x).toBeGreaterThan(0.85);
    expect(leftEye.scale.x).toBeLessThan(0.98);
    expect(backHair.position.z).toBeLessThanOrEqual(-0.25);
    expect(backHair.scale.z).toBeLessThanOrEqual(0.65);
    expect(nose.scale.x).toBeLessThanOrEqual(0.5);
    expect(avatar.object3d.getObjectByName('face-jaw')).toBeUndefined();
  });

  it('applies head, eyelid, mouth, and torso pose', () => {
    const avatar = new ProceduralAvatar(roleById('teen-male'));
    avatar.applyPose(POSE);

    expect(avatar.object3d.getObjectByName('avatar-head')?.rotation.y).toBeCloseTo(0.25);
    expect(avatar.object3d.getObjectByName('lid-left')?.scale.y).toBeGreaterThan(0.7);
    expect(avatar.object3d.getObjectByName('lid-right')?.scale.y).toBeLessThan(0.4);
    expect(avatar.object3d.getObjectByName('avatar-mouth')?.scale.y).toBeGreaterThan(1);
    expect(avatar.object3d.getObjectByName('avatar-mouth')?.scale.y).toBeLessThan(1.4);
    expect(avatar.object3d.getObjectByName('pupil-left')?.position.x).toBeGreaterThan(0);
    expect(avatar.object3d.getObjectByName('upper-lip')?.position.y).toBeGreaterThan(-0.36);
    expect(avatar.object3d.getObjectByName('lower-lip')?.position.y).toBeLessThan(-0.36);
    expect(avatar.object3d.getObjectByName('mouth-teeth')?.visible).toBe(true);
    expect(avatar.object3d.rotation.z).toBeCloseTo(POSE.torsoRoll);
  });

  it('keeps the head center anchored while distance scaling changes', () => {
    const avatar = new ProceduralAvatar(roleById('adult-female'));
    const head = avatar.object3d.getObjectByName('avatar-head')!;

    avatar.applyPose({ ...POSE, head: { x: 0, y: 0, z: 0 }, avatarScale: 0.8 });
    avatar.object3d.updateMatrixWorld(true);
    const farHeadY = head.getWorldPosition(new Vector3()).y;

    avatar.applyPose({ ...POSE, head: { x: 0, y: 0, z: 0 }, avatarScale: 1.4 });
    avatar.object3d.updateMatrixWorld(true);
    const nearHeadY = head.getWorldPosition(new Vector3()).y;

    expect(nearHeadY).toBeCloseTo(farHeadY, 5);
  });

  it('disposes owned geometry and materials', () => {
    const avatar = new ProceduralAvatar(roleById('senior-female'));
    const mesh = avatar.object3d.getObjectByName('lower-lip') as Mesh;
    const geometryDispose = vi.spyOn(mesh.geometry, 'dispose');
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const materialDispose = vi.spyOn(material!, 'dispose');

    avatar.dispose();

    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
  });
});
