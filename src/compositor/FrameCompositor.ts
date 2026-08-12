import type { FingerFrameState } from '../tracking/FingerFrameTracker';
import type { Quad } from '../tracking/types';

export interface CompositeInput {
  camera: CanvasImageSource;
  scene: CanvasImageSource;
  handOverlay: CanvasImageSource | null;
  frame: FingerFrameState;
  nowMs: number;
  mirrored: boolean;
}

export class FrameCompositor {
  private readonly context: CanvasRenderingContext2D;

  constructor(readonly canvas: HTMLCanvasElement, context?: CanvasRenderingContext2D) {
    const resolved = context ?? canvas.getContext('2d');
    if (!resolved) throw new Error('Frame compositor requires Canvas 2D');
    this.context = resolved;
  }

  setSize(width: number, height: number): void {
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
  }

  draw(input: CompositeInput): void {
    const { width, height } = this.canvas;
    const context = this.context;
    context.clearRect(0, 0, width, height);
    drawCamera(context, input.camera, width, height, input.mirrored);
    if (!input.frame.quad || input.frame.opacity <= 0) return;

    context.save();
    traceQuad(context, input.frame.quad);
    context.clip();
    context.globalAlpha = input.frame.opacity;
    context.drawImage(input.scene, 0, 0, width, height);
    context.restore();

    if (input.handOverlay) {
      context.save();
      context.globalAlpha = input.frame.opacity;
      context.drawImage(input.handOverlay, 0, 0, width, height);
      context.restore();
    }
    drawFrameDecoration(context, input.frame.quad, input.frame.opacity, input.nowMs);
  }
}

function drawCamera(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  mirrored: boolean,
): void {
  if (!mirrored) {
    context.drawImage(source, 0, 0, width, height);
    return;
  }
  context.save();
  context.translate(width, 0);
  context.scale(-1, 1);
  context.drawImage(source, 0, 0, width, height);
  context.restore();
}

function traceQuad(context: CanvasRenderingContext2D, quad: Quad): void {
  const first = quad[0];
  context.beginPath();
  context.moveTo(first.x, first.y);
  for (let index = 1; index < quad.length; index += 1) {
    const point = quad[index];
    if (point) context.lineTo(point.x, point.y);
  }
  context.closePath();
}

function drawFrameDecoration(
  context: CanvasRenderingContext2D,
  quad: Quad,
  opacity: number,
  nowMs: number,
): void {
  context.save();
  context.globalAlpha = opacity;
  context.strokeStyle = 'rgba(255,255,255,0.92)';
  context.lineWidth = 2;
  context.setLineDash([8, 6]);
  context.lineDashOffset = -(nowMs / 45) % 14;
  traceQuad(context, quad);
  context.stroke();
  context.setLineDash([]);
  const radius = 5 + Math.sin(nowMs / 220) * 1.5;
  context.fillStyle = '#bdf4ff';
  for (const point of quad) {
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}
