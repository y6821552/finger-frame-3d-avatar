import {
  AmbientLight,
  Color,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  type Camera,
  type Mesh,
} from 'three';

import type { Avatar } from '../avatar/Avatar';
import type { AvatarRole } from '../avatar/roles';
import type { AvatarPose } from '../motion/types';
import type { QualityProfile } from '../performance/QualityController';

export interface SceneRenderer {
  readonly domElement: HTMLCanvasElement;
  readonly shadowMap: { enabled: boolean };
  setPixelRatio(value: number): void;
  setSize(width: number, height: number, updateStyle?: boolean): void;
  setClearColor(color: Color | string | number, alpha?: number): void;
  render(scene: Scene, camera: Camera): void;
  dispose(): void;
}

export interface CartoonSceneOptions {
  canvas?: HTMLCanvasElement;
  renderer?: SceneRenderer;
}

export class CartoonScene {
  readonly canvas: HTMLCanvasElement;
  private readonly renderer: SceneRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(28, 16 / 9, 0.1, 100);
  private readonly key = new DirectionalLight('#fff0dc', 4.1);
  private readonly rim = new DirectionalLight('#98dfff', 2.3);
  private avatar: Avatar | null = null;
  private roleId = '';
  private qualityId = '';

  constructor(options: CartoonSceneOptions = {}) {
    this.canvas = options.renderer?.domElement ?? options.canvas ?? document.createElement('canvas');
    this.renderer = options.renderer ?? new WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 0);

    this.camera.position.set(0, 0.72, 5.45);
    this.camera.lookAt(0, 0.68, 0);
    this.scene.background = null;
    this.scene.add(this.camera);
    this.scene.add(new HemisphereLight('#e8f3ff', '#6b3b4f', 1.8));
    this.scene.add(new AmbientLight('#fff5ee', 1.15));
    this.key.position.set(-3.4, 4.8, 4.6);
    this.key.castShadow = true;
    this.scene.add(this.key);
    this.rim.position.set(3.6, 2.2, -2.5);
    this.scene.add(this.rim);
  }

  setAvatar(avatar: Avatar): void {
    if (this.avatar === avatar) return;
    if (this.avatar) this.scene.remove(this.avatar.object3d);
    this.avatar = avatar;
    avatar.object3d.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = false;
    });
    this.scene.add(avatar.object3d);
  }

  render(
    pose: AvatarPose,
    role: AvatarRole,
    quality: QualityProfile,
    deltaSeconds: number,
  ): HTMLCanvasElement {
    void deltaSeconds;
    if (this.roleId !== role.id) this.applyRoleLighting(role);
    if (this.qualityId !== quality.id) this.applyQuality(quality);
    this.avatar?.applyPose(pose);
    this.renderer.render(this.scene, this.camera);
    return this.canvas;
  }

  backgroundHex(): string {
    return 'transparent';
  }

  dispose(): void {
    this.avatar = null;
    this.renderer.dispose();
  }

  private applyRoleLighting(role: AvatarRole): void {
    this.roleId = role.id;
    this.key.color.set(role.theme.accent).lerp(new Color('#fff5e8'), 0.78);
    this.rim.color.set(role.theme.secondary).lerp(new Color('#bfeeff'), 0.55);
    this.renderer.setClearColor(0x000000, 0);
  }

  private applyQuality(quality: QualityProfile): void {
    this.qualityId = quality.id;
    this.renderer.setSize(quality.width, quality.height, false);
    this.renderer.shadowMap.enabled = quality.shadows;
    this.camera.aspect = quality.width / quality.height;
    this.camera.updateProjectionMatrix();
  }
}
