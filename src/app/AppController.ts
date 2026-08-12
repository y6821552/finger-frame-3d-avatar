import type { Avatar } from '../avatar/Avatar';
import type { AvatarRole } from '../avatar/roles';
import { MotionMapper } from '../motion/MotionMapper';
import type { AvatarPose } from '../motion/types';
import {
  QualityController,
  type QualityMode,
  type QualityProfile,
} from '../performance/QualityController';
import { FingerFrameTracker, type FingerFrameState } from '../tracking/FingerFrameTracker';
import type { TrackingSnapshot, TrackingSource } from '../tracking/types';

type FacingMode = 'user' | 'environment';
type StatusState = 'loading' | 'ready' | 'warning' | 'error';

export interface FrameInputPort {
  readonly video: HTMLVideoElement;
  readonly frame: CanvasImageSource;
  readonly mirrored: boolean;
  readonly width: number;
  readonly height: number;
  start(facingMode: FacingMode): Promise<void>;
  stop(): void;
}

export interface AppUiPort {
  readonly selectedRole: AvatarRole;
  onRoleChange(listener: (role: AvatarRole) => void): () => void;
  onQualityChange(listener: (mode: QualityMode) => void): () => void;
  onCameraChange(listener: () => void): () => void;
  setStatus(message: string, state?: StatusState): void;
  setFps(value: number): void;
  setQuality(mode: QualityMode): void;
  setGestureState(handCount: number, active: boolean): void;
  destroy(): void;
}

interface AvatarManagerPort {
  select(role: AvatarRole): Promise<Avatar>;
  dispose(): void;
}

interface ScenePort {
  readonly canvas: HTMLCanvasElement;
  setAvatar(avatar: Avatar): void;
  render(
    pose: AvatarPose,
    role: AvatarRole,
    quality: QualityProfile,
    deltaSeconds: number,
  ): HTMLCanvasElement;
  dispose(): void;
}

interface HandMaskPort {
  render(
    camera: CanvasImageSource,
    hands: TrackingSnapshot['hands'],
    size: { width: number; height: number },
    mirrored?: boolean,
  ): HTMLCanvasElement | null;
}

interface ToonPort {
  render(
    camera: CanvasImageSource,
    role: AvatarRole,
    pose: AvatarPose,
    size: { width: number; height: number },
    nowMs: number,
  ): CanvasImageSource;
}

interface CompositorPort {
  readonly canvas?: HTMLCanvasElement;
  setSize(width: number, height: number): void;
  draw(input: {
    camera: CanvasImageSource;
    scene: CanvasImageSource;
    handOverlay: CanvasImageSource | null;
    frame: FingerFrameState;
    nowMs: number;
    mirrored: boolean;
  }): void;
}

export interface AppControllerDependencies {
  input: FrameInputPort;
  createTracking(): Promise<TrackingSource>;
  avatarManager: AvatarManagerPort;
  scene: ScenePort | null;
  compositor: CompositorPort;
  handMask: HandMaskPort;
  toon: ToonPort;
  ui: AppUiPort;
  requestFrame?: (callback: FrameRequestCallback) => number;
  cancelFrame?: (id: number) => void;
  now?: () => number;
}

const EMPTY_SNAPSHOT: TrackingSnapshot = {
  timestampMs: 0,
  hands: [],
  face: null,
  pose: null,
};

export class AppController {
  private readonly fingerFrame = new FingerFrameTracker();
  private readonly motion = new MotionMapper();
  private readonly quality = new QualityController();
  private readonly requestFrame: (callback: FrameRequestCallback) => number;
  private readonly cancelFrame: (id: number) => void;
  private readonly now: () => number;
  private tracking: TrackingSource | null = null;
  private snapshot: TrackingSnapshot = structuredClone(EMPTY_SNAPSHOT);
  private role: AvatarRole;
  private facingMode: FacingMode = 'user';
  private frameId: number | null = null;
  private previousFrameMs: number | null = null;
  private fpsStartMs = 0;
  private fpsFrames = 0;
  private sampling = false;
  private running = false;
  private resourcesReleased = false;
  private disposed = false;
  private disposers: Array<() => void> = [];

  constructor(private readonly deps: AppControllerDependencies) {
    this.role = deps.ui.selectedRole;
    this.requestFrame = deps.requestFrame ?? requestAnimationFrame.bind(window);
    this.cancelFrame = deps.cancelFrame ?? cancelAnimationFrame.bind(window);
    this.now = deps.now ?? performance.now.bind(performance);
  }

  async start(): Promise<void> {
    if (this.running) return;
    if (this.disposed) throw new Error('The application controller has been disposed');
    try {
      this.deps.ui.setStatus('Starting camera…', 'loading');
      await this.deps.input.start(this.facingMode);
      this.deps.compositor.setSize(this.deps.input.width, this.deps.input.height);

      this.deps.ui.setStatus('Loading local tracking models…', 'loading');
      this.tracking = await this.deps.createTracking();
      await this.tracking.start(this.deps.input.video);

      let avatar: Avatar | null = null;
      if (this.deps.scene) {
        avatar = await this.deps.avatarManager.select(this.role);
        this.deps.scene.setAvatar(avatar);
      }
      this.installListeners();
      this.running = true;
      this.fpsStartMs = this.now();
      this.deps.ui.setQuality('auto');
      if (this.deps.scene && avatar) {
        this.deps.ui.setStatus(`Live · ${this.tracking.mode} · ${avatar.kind} avatar`, 'ready');
      } else {
        this.deps.ui.setStatus('WebGL unavailable · Toon fallback active', 'warning');
      }
      this.frameId = this.requestFrame(this.tick);
    } catch (error) {
      this.releaseResources();
      throw error;
    }
  }

  stop(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.frameId !== null) {
      this.cancelFrame(this.frameId);
      this.frameId = null;
    }
    this.running = false;
    this.disposers.splice(0).forEach((dispose) => dispose());
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.releaseResources();
    this.deps.ui.destroy();
  }

  private readonly tick = (timestampMs: number): void => {
    if (!this.running) return;
    this.frameId = this.requestFrame(this.tick);
    const deltaMs = this.previousFrameMs === null ? 16.67 : Math.max(1, timestampMs - this.previousFrameMs);
    this.previousFrameMs = timestampMs;
    const size = { width: this.deps.input.width, height: this.deps.input.height };
    this.deps.compositor.setSize(size.width, size.height);
    this.sampleTracking(timestampMs);

    const frame = this.fingerFrame.update(this.snapshot.hands, size, timestampMs, this.deps.input.mirrored);
    const pose = this.motion.update(this.snapshot, timestampMs, this.deps.input.mirrored);
    this.deps.ui.setGestureState(this.snapshot.hands.length, frame.active);
    const quality = this.quality.sample(deltaMs);
    const scene = this.deps.scene
      ? this.deps.scene.render(pose, this.role, quality, deltaMs / 1_000)
      : this.deps.toon.render(this.deps.input.frame, this.role, pose, size, timestampMs);
    const handOverlay = this.deps.handMask.render(
      this.deps.input.frame,
      this.snapshot.hands,
      size,
      this.deps.input.mirrored,
    );
    this.deps.compositor.draw({
      camera: this.deps.input.frame,
      scene,
      handOverlay,
      frame,
      nowMs: timestampMs,
      mirrored: this.deps.input.mirrored,
    });
    if (this.deps.compositor.canvas) {
      this.deps.compositor.canvas.dataset.frameActive = String(frame.active);
      this.deps.compositor.canvas.dataset.role = this.role.id;
      this.deps.compositor.canvas.dataset.quality = quality.id;
    }
    this.updateFps(timestampMs);
  };

  private sampleTracking(timestampMs: number): void {
    if (!this.tracking || this.sampling) return;
    this.sampling = true;
    void this.tracking.sample(timestampMs).then((snapshot) => {
      if (this.running) this.snapshot = snapshot;
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown tracking error';
      this.deps.ui.setStatus(`Tracking paused · ${message}`, 'warning');
    }).finally(() => {
      this.sampling = false;
    });
  }

  private installListeners(): void {
    this.disposers.push(
      this.deps.ui.onRoleChange((role) => {
        this.role = role;
        if (!this.deps.scene) return;
        void this.deps.avatarManager.select(role).then((avatar) => {
          if (!this.running || avatar.role.id !== this.role.id) return;
          this.deps.scene?.setAvatar(avatar);
        });
      }),
      this.deps.ui.onQualityChange((mode) => {
        this.quality.setMode(mode);
        this.deps.ui.setQuality(mode);
      }),
      this.deps.ui.onCameraChange(() => {
        this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
        this.deps.ui.setStatus('Switching camera…', 'loading');
        void this.deps.input.start(this.facingMode).then(() => {
          this.deps.ui.setStatus(`Live · ${this.tracking?.mode ?? 'tracking'}`, 'ready');
        }).catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Camera switch failed';
          this.deps.ui.setStatus(message, 'error');
        });
      }),
    );
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private readonly onVisibilityChange = (): void => {
    this.tracking?.setSuspended(document.hidden);
  };

  private releaseResources(): void {
    if (this.resourcesReleased) return;
    this.resourcesReleased = true;
    this.tracking?.stop();
    this.tracking = null;
    this.deps.input.stop();
    this.deps.avatarManager.dispose();
    this.deps.scene?.dispose();
  }

  private updateFps(timestampMs: number): void {
    this.fpsFrames += 1;
    const elapsed = timestampMs - this.fpsStartMs;
    if (elapsed < 500) return;
    this.deps.ui.setFps((this.fpsFrames * 1_000) / Math.max(1, elapsed));
    this.fpsFrames = 0;
    this.fpsStartMs = timestampMs;
  }
}
