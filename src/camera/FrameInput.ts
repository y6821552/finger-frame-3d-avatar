import type { FrameInputPort } from '../app/AppController';
import { CameraController, type FacingMode } from './CameraController';

interface CameraPort {
  readonly video: HTMLVideoElement;
  start(facingMode: FacingMode): Promise<HTMLVideoElement>;
  stop(): void;
}

export class BrowserFrameInput implements FrameInputPort {
  mirrored = true;
  constructor(private readonly camera: CameraPort = new CameraController()) {}

  get video(): HTMLVideoElement {
    return this.camera.video;
  }

  get frame(): CanvasImageSource {
    return this.camera.video;
  }

  get width(): number {
    return this.camera.video.videoWidth || this.camera.video.width || 1_280;
  }

  get height(): number {
    return this.camera.video.videoHeight || this.camera.video.height || 720;
  }

  async start(facingMode: FacingMode): Promise<void> {
    await this.camera.start(facingMode);
    this.mirrored = facingMode === 'user';
  }

  stop(): void {
    this.camera.stop();
  }
}

export interface DemoFrameInputOptions {
  canvas?: HTMLCanvasElement;
  context?: CanvasRenderingContext2D;
  width?: number;
  height?: number;
  requestFrame?: (callback: FrameRequestCallback) => number;
  cancelFrame?: (id: number) => void;
}

export class DemoFrameInput implements FrameInputPort {
  readonly mirrored = true;
  readonly video = document.createElement('video');
  readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly requestFrame: (callback: FrameRequestCallback) => number;
  private readonly cancelFrame: (id: number) => void;
  private frameId: number | null = null;
  private running = false;

  constructor(options: DemoFrameInputOptions = {}) {
    this.canvas = options.canvas ?? document.createElement('canvas');
    this.canvas.width = options.width ?? 1_280;
    this.canvas.height = options.height ?? 720;
    const context = options.context ?? this.canvas.getContext('2d');
    if (!context) throw new Error('Demo input requires Canvas 2D');
    this.context = context;
    this.requestFrame = options.requestFrame ?? requestAnimationFrame.bind(window);
    this.cancelFrame = options.cancelFrame ?? cancelAnimationFrame.bind(window);
    this.video.muted = true;
    this.video.playsInline = true;
  }

  get frame(): CanvasImageSource {
    return this.canvas;
  }

  get width(): number {
    return this.canvas.width;
  }

  get height(): number {
    return this.canvas.height;
  }

  async start(facingMode: FacingMode): Promise<void> {
    void facingMode;
    if (this.running) return;
    this.running = true;
    this.paint(0);
    this.frameId = this.requestFrame(this.paint);
    await Promise.resolve();
  }

  stop(): void {
    this.running = false;
    if (this.frameId !== null) {
      this.cancelFrame(this.frameId);
      this.frameId = null;
    }
  }

  private readonly paint = (timestampMs: number): void => {
    if (!this.running) return;
    const context = this.context;
    const width = this.width;
    const height = this.height;
    const time = timestampMs / 1_000;
    const drift = Math.sin(time * 0.75) * width * 0.025;
    context.clearRect(0, 0, width, height);
    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, '#8d8279');
    background.addColorStop(0.55, '#6f6865');
    background.addColorStop(1, '#49464a');
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    drawDemoPerson(context, width / 2 + drift, height, time);
    drawDemoHand(context, width * 0.22 + drift, height, -1, time);
    drawDemoHand(context, width * 0.78 + drift, height, 1, time + 0.4);
    this.frameId = this.requestFrame(this.paint);
  };
}

function drawDemoPerson(context: CanvasRenderingContext2D, centerX: number, height: number, time: number): void {
  const headY = height * 0.36;
  context.fillStyle = '#292326';
  context.beginPath();
  context.arc(centerX, headY, height * 0.16, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#d59a7b';
  context.beginPath();
  context.arc(centerX, headY, height * 0.12, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#ebe5e2';
  context.beginPath();
  context.moveTo(centerX - height * 0.29, height);
  context.quadraticCurveTo(centerX - height * 0.24, height * 0.6, centerX, height * 0.58);
  context.quadraticCurveTo(centerX + height * 0.24, height * 0.6, centerX + height * 0.29, height);
  context.fill();
  context.strokeStyle = '#3c2928';
  context.lineWidth = 7;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(centerX - height * 0.045, headY);
  context.lineTo(centerX - height * 0.02, headY);
  context.moveTo(centerX + height * 0.02, headY);
  context.lineTo(centerX + height * 0.045, headY);
  context.stroke();
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(centerX - height * 0.035, headY + height * 0.065);
  context.quadraticCurveTo(
    centerX,
    headY + height * (0.085 + Math.sin(time * 2.2) * 0.006),
    centerX + height * 0.035,
    headY + height * 0.065,
  );
  context.stroke();
}

function drawDemoHand(
  context: CanvasRenderingContext2D,
  x: number,
  height: number,
  direction: -1 | 1,
  time: number,
): void {
  const wave = Math.sin(time * 0.9) * height * 0.012;
  const wristY = height * 0.72 + wave;
  context.strokeStyle = '#d99d7c';
  context.lineWidth = height * 0.075;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  context.moveTo(x, height);
  context.lineTo(x, wristY);
  context.stroke();
  context.lineWidth = height * 0.052;
  context.beginPath();
  context.moveTo(x, height * 0.62 + wave);
  context.lineTo(x + direction * height * 0.05, height * 0.2 + wave);
  context.moveTo(x, height * 0.62 + wave);
  context.lineTo(x + direction * height * 0.16, height * 0.61 + wave);
  context.stroke();
  context.fillStyle = '#d99d7c';
  context.beginPath();
  context.arc(x, height * 0.62 + wave, height * 0.065, 0, Math.PI * 2);
  context.fill();
}
