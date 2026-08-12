import {
  CircleGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  type Material,
  type Object3D,
} from 'three';

import type { AvatarPose } from '../motion/types';
import type { Avatar } from './Avatar';
import { cinematicStyleFor, type CinematicAvatarStyle } from './cinematicStyles';
import type { AvatarRole } from './roles';

export class ProceduralAvatar implements Avatar {
  readonly kind = 'procedural' as const;
  readonly object3d = new Group();
  private readonly baseY = -0.68;
  private readonly headCenterY = 1.43;
  private readonly head = new Group();
  private readonly torso = new Group();
  private readonly eyeLeft: Group;
  private readonly eyeRight: Group;
  private readonly pupilLeft: Mesh;
  private readonly pupilRight: Mesh;
  private readonly lidLeft: Mesh;
  private readonly lidRight: Mesh;
  private readonly browLeft: Mesh;
  private readonly browRight: Mesh;
  private readonly mouth = new Group();
  private readonly upperLip: Mesh;
  private readonly lowerLip: Mesh;
  private readonly teeth: Mesh;
  private readonly cheekLeft: Mesh;
  private readonly cheekRight: Mesh;

  constructor(readonly role: AvatarRole) {
    const style = cinematicStyleFor(role);
    this.object3d.name = 'avatar-root';
    this.object3d.position.y = this.baseY;

    this.torso.name = 'avatar-torso';
    this.object3d.add(this.torso);
    buildTorso(this.torso, style);

    this.head.name = 'avatar-head';
    this.head.position.y = 1.43;
    this.head.scale.setScalar(style.face.headScale);
    this.object3d.add(this.head);
    buildFace(this.head, style);

    const leftEye = buildEye('left', style);
    const rightEye = buildEye('right', style);
    this.eyeLeft = leftEye.group;
    this.eyeRight = rightEye.group;
    this.pupilLeft = leftEye.pupil;
    this.pupilRight = rightEye.pupil;
    this.lidLeft = leftEye.lid;
    this.lidRight = rightEye.lid;
    this.head.add(this.eyeLeft, this.eyeRight);

    const browMaterial = hairMaterial(style.palette.hair);
    this.browLeft = brow(-1, browMaterial, style.ageDetail);
    this.browRight = brow(1, browMaterial, style.ageDetail);
    this.head.add(this.browLeft, this.browRight);

    const mouth = buildMouth(style);
    this.mouth = mouth.group;
    this.upperLip = mouth.upperLip;
    this.lowerLip = mouth.lowerLip;
    this.teeth = mouth.teeth;
    this.head.add(this.mouth);

    const cheeks = buildCheeks(style);
    this.cheekLeft = cheeks.left;
    this.cheekRight = cheeks.right;
    this.head.add(this.cheekLeft, this.cheekRight);

    this.head.add(buildHair(style));
    if (style.ageDetail > 0.2) this.head.add(buildAgeDetails(style));
  }

  applyPose(pose: AvatarPose): void {
    this.head.rotation.set(pose.head.x, pose.head.y, pose.head.z);
    this.object3d.rotation.z = pose.torsoRoll;
    const scaleCompensation = 1 - pose.avatarScale;
    const rotatedHeadX = -Math.sin(pose.torsoRoll) * this.headCenterY;
    const rotatedHeadY = Math.cos(pose.torsoRoll) * this.headCenterY;
    this.object3d.position.x = pose.anchorX + rotatedHeadX * scaleCompensation;
    this.object3d.position.y = this.baseY + pose.anchorY + rotatedHeadY * scaleCompensation;
    this.object3d.scale.setScalar(pose.avatarScale);
    this.torso.position.y = pose.shoulderLift + pose.breath * 0.012;

    this.lidLeft.scale.y = 0.04 + pose.blinkLeft * 0.96;
    this.lidRight.scale.y = 0.04 + pose.blinkRight * 0.96;
    const gazeX = pose.gazeX * 0.032;
    const gazeY = pose.gazeY * 0.026;
    this.pupilLeft.position.set(gazeX, gazeY, 0.015);
    this.pupilRight.position.set(gazeX, gazeY, 0.015);

    const mouthOpen = pose.mouthOpen;
    this.mouth.scale.set(1 + pose.smile * 0.11, 1 + mouthOpen * 0.38, 1);
    this.upperLip.position.y = -0.32 + pose.smile * 0.014 + mouthOpen * 0.008;
    this.lowerLip.position.y = -0.39 - mouthOpen * 0.038;
    this.teeth.visible = mouthOpen > 0.12;
    this.teeth.scale.y = 0.45 + mouthOpen * 0.55;

    const browY = 0.47 + pose.browRaise * 0.085 - pose.browFrown * 0.028;
    this.browLeft.position.y = browY;
    this.browRight.position.y = browY;
    this.browLeft.rotation.z = -0.08 - pose.browFrown * 0.24;
    this.browRight.rotation.z = 0.08 + pose.browFrown * 0.24;
    const blushOpacity = 0.08 + pose.smile * 0.1;
    setOpacity(this.cheekLeft, blushOpacity);
    setOpacity(this.cheekRight, blushOpacity);
  }

  dispose(): void {
    const geometries = new Set<{ dispose(): void }>();
    const materials = new Set<Material>();
    this.object3d.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      geometries.add(mesh.geometry);
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      list.forEach((material) => materials.add(material));
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    this.object3d.clear();
  }
}

function buildTorso(group: Group, style: CinematicAvatarStyle): void {
  const outfit = clothMaterial(style.palette.outfit);
  const body = new Mesh(new SphereGeometry(1, 32, 20), outfit);
  body.name = 'outfit-body';
  body.scale.set(1.05 * style.shoulderScale, 0.94, 0.54);
  body.position.y = -0.12;
  group.add(body);

  const shoulders = new Mesh(new SphereGeometry(0.82, 30, 18), clothMaterial(style.palette.outfit, 0.92));
  shoulders.name = 'outfit-shoulders';
  shoulders.scale.set(1.5 * style.shoulderScale, 0.45, 0.68);
  shoulders.position.y = 0.44;
  group.add(shoulders);

  const neck = new Mesh(new CylinderGeometry(0.23, 0.28, 0.46, 28), skinMaterial(style.palette.skin));
  neck.name = 'avatar-neck';
  neck.position.y = 0.79;
  group.add(neck);

  const collar = new Mesh(new TorusGeometry(0.33, 0.045, 12, 40), clothMaterial(style.palette.accent));
  collar.name = 'outfit-collar';
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.68, 0.4);
  group.add(collar);
}

function buildFace(group: Group, style: CinematicAvatarStyle): void {
  const face = new Mesh(new SphereGeometry(0.78, 48, 34), skinMaterial(style.palette.skin));
  face.name = 'avatar-face';
  face.scale.set(style.face.width, style.face.height, style.face.depth);
  group.add(face);

  const earGeometry = new SphereGeometry(0.15, 24, 16);
  for (const direction of [-1, 1]) {
    const ear = new Mesh(earGeometry, skinMaterial(style.palette.skinShadow));
    ear.name = direction < 0 ? 'ear-left' : 'ear-right';
    ear.position.set(direction * 0.72, -0.02, 0);
    ear.scale.set(0.7, 1.12, 0.48);
    group.add(ear);
  }

  const nose = new Mesh(new SphereGeometry(0.09, 24, 18), skinMaterial(style.palette.skinShadow));
  nose.name = 'avatar-nose';
  nose.position.set(0, -0.09, 0.735);
  nose.scale.set(0.45, 0.82, 0.62);
  group.add(nose);
}

function buildEye(side: 'left' | 'right', style: CinematicAvatarStyle) {
  const direction = side === 'left' ? -1 : 1;
  const group = new Group();
  group.name = `eye-${side}`;
  group.position.set(direction * style.eye.spacing, 0.13, 0.655);
  group.scale.setScalar(style.eye.scale);

  const white = new Mesh(new SphereGeometry(0.185, 32, 22), eyeWhiteMaterial());
  white.name = `eye-white-${side}`;
  white.scale.set(1.06, 1.16, 0.46);
  group.add(white);

  const iris = new Mesh(new CircleGeometry(0.1 * style.eye.irisScale, 36), irisMaterial(style.palette.iris));
  iris.name = `iris-${side}`;
  iris.position.z = 0.098;
  group.add(iris);

  const limbal = new Mesh(
    new TorusGeometry(0.1 * style.eye.irisScale, 0.01, 10, 36),
    new MeshStandardMaterial({ color: '#161824', roughness: 0.45 }),
  );
  limbal.name = `iris-ring-${side}`;
  limbal.position.z = 0.103;
  group.add(limbal);

  const pupil = new Mesh(new CircleGeometry(0.043, 28), new MeshStandardMaterial({ color: '#080911' }));
  pupil.name = `pupil-${side}`;
  pupil.position.z = 0.11;
  iris.add(pupil);

  const catchlight = new Mesh(new CircleGeometry(0.024, 20), new MeshStandardMaterial({ color: '#ffffff' }));
  catchlight.name = `eye-catchlight-${side}`;
  catchlight.position.set(-0.038, 0.047, 0.014);
  iris.add(catchlight);
  const catchlightSmall = new Mesh(new CircleGeometry(0.009, 16), new MeshStandardMaterial({ color: '#d8f7ff' }));
  catchlightSmall.position.set(0.038, -0.035, 0.014);
  iris.add(catchlightSmall);

  const lid = new Mesh(
    new SphereGeometry(0.198, 30, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    skinMaterial(style.palette.skinShadow),
  );
  lid.name = `lid-${side}`;
  lid.position.z = 0.055;
  lid.rotation.x = Math.PI;
  lid.scale.set(1.08, 0.04, 0.52);
  group.add(lid);
  return { group, pupil, lid };
}

function brow(direction: -1 | 1, material: Material, ageDetail: number): Mesh {
  const mesh = new Mesh(new SphereGeometry(0.16, 20, 12), material);
  mesh.name = direction < 0 ? 'brow-left' : 'brow-right';
  mesh.position.set(direction * 0.29, 0.47, 0.71);
  mesh.scale.set(1.14, 0.18 + ageDetail * 0.03, 0.2);
  mesh.rotation.z = direction * 0.08;
  return mesh;
}

function buildMouth(style: CinematicAvatarStyle) {
  const group = new Group();
  group.name = 'avatar-mouth';
  const cavity = new Mesh(new SphereGeometry(0.13, 28, 18), new MeshStandardMaterial({ color: '#3b1823', roughness: 0.85 }));
  cavity.name = 'mouth-cavity';
  cavity.position.set(0, -0.36, 0.715);
  cavity.scale.set(1.1, 0.46, 0.25);
  group.add(cavity);

  const lipMaterial = new MeshPhysicalMaterial({ color: style.palette.blush, roughness: 0.66, sheen: 0.25 });
  const upperLip = new Mesh(new SphereGeometry(0.12, 28, 14), lipMaterial);
  upperLip.name = 'upper-lip';
  upperLip.position.set(0, -0.32, 0.738);
  upperLip.scale.set(1.16, 0.2, 0.22);
  group.add(upperLip);
  const lowerLip = upperLip.clone();
  lowerLip.name = 'lower-lip';
  lowerLip.position.y = -0.39;
  lowerLip.scale.set(1.1, 0.24, 0.24);
  group.add(lowerLip);

  const teeth = new Mesh(new SphereGeometry(0.07, 24, 12), new MeshStandardMaterial({ color: '#fff8ed', roughness: 0.5 }));
  teeth.name = 'mouth-teeth';
  teeth.position.set(0, -0.345, 0.744);
  teeth.scale.set(1.1, 0.45, 0.12);
  teeth.visible = false;
  group.add(teeth);
  return { group, upperLip, lowerLip, teeth };
}

function buildCheeks(style: CinematicAvatarStyle) {
  const material = new MeshStandardMaterial({
    color: new Color(style.palette.blush), transparent: true, opacity: 0.16, roughness: 1,
    depthWrite: false,
  });
  const left = new Mesh(new CircleGeometry(0.09 * style.face.cheekFullness, 28), material);
  left.name = 'cheek-left';
  left.position.set(-0.46, -0.16, 0.7);
  const right = left.clone();
  right.name = 'cheek-right';
  right.position.x = 0.46;
  return { left, right };
}

function buildHair(style: CinematicAvatarStyle): Object3D {
  const group = new Group();
  group.name = 'avatar-hair';
  const material = hairMaterial(style.palette.hair);

  const back = new Mesh(new SphereGeometry(0.83, 40, 26), material);
  back.name = 'hair-back-volume';
  back.position.set(0, 0.08, -0.31);
  back.scale.set(0.98 * style.hair.volume, 1.04 + style.hair.length * 0.2, 0.6);
  group.add(back);

  const crown = new Mesh(new SphereGeometry(0.79, 40, 22, 0, Math.PI * 2, 0, Math.PI * 0.5), material);
  crown.name = 'hair-crown';
  crown.position.set(0, 0.2, 0.01);
  crown.scale.set(0.96 * style.hair.volume, 1.05, 0.94);
  group.add(crown);

  const sideLength = style.hair.length;
  for (const direction of [-1, 1]) {
    const side = new Mesh(new SphereGeometry(0.31, 28, 20), material);
    side.name = direction < 0 ? 'hair-side-left' : 'hair-side-right';
    side.position.set(direction * 0.66, -0.16 - sideLength * 0.08, -0.03);
    side.scale.set(0.6 * style.hair.volume, 1.12 + sideLength * 0.72, 0.72);
    side.rotation.z = direction * -0.05;
    group.add(side);
  }

  for (let index = 0; index < style.hair.layers; index += 1) {
    const t = style.hair.layers === 1 ? 0.5 : index / (style.hair.layers - 1);
    const fringe = new Mesh(new SphereGeometry(0.23, 24, 16), material);
    fringe.name = `hair-fringe-${index}`;
    fringe.position.set(-0.42 + t * 0.84, 0.57 - Math.sin(t * Math.PI) * 0.07, 0.48);
    fringe.scale.set(0.76, 1.16, 0.35);
    fringe.rotation.z = -0.35 + t * 0.7;
    group.add(fringe);
  }

  if (style.hair.silhouette === 'waves' || style.hair.silhouette === 'silver-bob') {
    for (const direction of [-1, 1]) {
      const curl = new Mesh(new TorusGeometry(0.2, 0.075, 12, 26, Math.PI * 1.45), material);
      curl.name = direction < 0 ? 'hair-curl-left' : 'hair-curl-right';
      curl.position.set(direction * 0.64, -0.56, 0.06);
      curl.rotation.z = direction < 0 ? -0.55 : Math.PI + 0.55;
      group.add(curl);
    }
  }
  return group;
}

function buildAgeDetails(style: CinematicAvatarStyle): Group {
  const group = new Group();
  group.name = 'age-details';
  const material = new MeshStandardMaterial({
    color: style.palette.skinShadow, transparent: true, opacity: style.ageDetail * 0.3,
    roughness: 1, depthWrite: false,
  });
  for (const [x, y, rotation] of [
    [-0.31, -0.12, -0.14], [0.31, -0.12, 0.14], [-0.22, -0.25, -0.08], [0.22, -0.25, 0.08],
  ] as const) {
    const line = new Mesh(new SphereGeometry(0.08, 16, 8), material);
    line.position.set(x, y, 0.715);
    line.scale.set(1.2, 0.055, 0.08);
    line.rotation.z = rotation;
    group.add(line);
  }
  return group;
}

function skinMaterial(color: string): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: new Color(color), roughness: 0.68, metalness: 0, sheen: 0.28,
    sheenColor: new Color('#ffd4c7'), clearcoat: 0.05, clearcoatRoughness: 0.8,
  });
}

function hairMaterial(color: string): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: new Color(color), roughness: 0.46, sheen: 0.7,
    sheenColor: new Color('#b79ab7'), clearcoat: 0.08, clearcoatRoughness: 0.6,
  });
}

function clothMaterial(color: string, roughness = 0.82): MeshStandardMaterial {
  return new MeshStandardMaterial({ color: new Color(color), roughness, metalness: 0 });
}

function eyeWhiteMaterial(): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: '#fffdf9', roughness: 0.18, clearcoat: 0.55, clearcoatRoughness: 0.22,
  });
}

function irisMaterial(color: string): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({ color, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.18 });
}

function setOpacity(mesh: Mesh, opacity: number): void {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  materials.forEach((material) => {
    material.transparent = true;
    material.opacity = opacity;
  });
}
