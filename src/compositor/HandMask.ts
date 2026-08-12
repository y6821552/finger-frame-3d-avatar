import type { HandObservation, Landmark, Point, Size } from '../tracking/types';

const FINGER_CHAINS = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [17, 18, 19, 20],
] as const;
const PALM = [0, 1, 5, 9, 13, 17] as const;

export class HandMask {
  readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;

  constructor(canvas = document.createElement('canvas')) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Hand mask requires Canvas 2D');
    this.context = context;
  }

  render(camera: CanvasImageSource, hands: HandObservation[], size: Size, mirrored = true): HTMLCanvasElement | null {
    if (hands.length === 0) return null;
    if (this.canvas.width !== size.width || this.canvas.height !== size.height) {
      this.canvas.width = size.width;
      this.canvas.height = size.height;
    }
    const context = this.context;
    context.clearRect(0, 0, size.width, size.height);
    context.save();
    context.filter = `blur(${Math.max(2, size.width / 320)}px)`;
    traceHandMask(context, hands, size, mirrored);
    context.restore();
    context.globalCompositeOperation = 'source-in';
    drawCamera(context, camera, size, mirrored);
    context.globalCompositeOperation = 'source-over';
    return this.canvas;
  }
}

export function traceHandMask(
  context: CanvasRenderingContext2D,
  hands: HandObservation[],
  size: Size,
  mirrored = true,
): void {
  context.fillStyle = '#ffffff';
  context.strokeStyle = '#ffffff';
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const hand of hands) {
    const points = hand.landmarks.map((landmark) => toPixel(landmark, size, mirrored));
    const wrist = points[0];
    const middle = points[9];
    if (!wrist || !middle) continue;

    context.beginPath();
    PALM.forEach((index, order) => {
      const point = points[index];
      if (!point) return;
      if (order === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
    context.fill();

    const dx = wrist.x - middle.x;
    const dy = wrist.y - middle.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const normalX = (-dy / length) * size.width * 0.035;
    const normalY = (dx / length) * size.width * 0.035;
    const extensionX = (dx / length) * size.height * 0.24;
    const extensionY = (dy / length) * size.height * 0.24;
    context.beginPath();
    context.moveTo(wrist.x + normalX, wrist.y + normalY);
    context.lineTo(wrist.x + extensionX + normalX * 1.35, wrist.y + extensionY + normalY * 1.35);
    context.lineTo(wrist.x + extensionX - normalX * 1.35, wrist.y + extensionY - normalY * 1.35);
    context.lineTo(wrist.x - normalX, wrist.y - normalY);
    context.closePath();
    context.fill();

    context.lineWidth = Math.max(20, distance(wrist, middle) * 0.48);
    for (const chain of FINGER_CHAINS) {
      const firstIndex = chain[0];
      const first = points[firstIndex];
      if (!first) continue;
      context.beginPath();
      context.moveTo(first.x, first.y);
      for (let index = 1; index < chain.length; index += 1) {
        const previousIndex = chain[index - 1];
        const pointIndex = chain[index];
        if (previousIndex === undefined || pointIndex === undefined) continue;
        const previous = points[previousIndex];
        const point = points[pointIndex];
        if (!previous || !point) continue;
        context.quadraticCurveTo(previous.x, previous.y, point.x, point.y);
      }
      context.stroke();
    }
  }
}

function toPixel(landmark: Landmark, size: Size, mirrored: boolean): Point {
  return { x: (mirrored ? 1 - landmark.x : landmark.x) * size.width, y: landmark.y * size.height };
}

function distance(left: Point, right: Point): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function drawCamera(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  size: Size,
  mirrored: boolean,
): void {
  if (!mirrored) {
    context.drawImage(source, 0, 0, size.width, size.height);
    return;
  }
  context.save();
  context.translate(size.width, 0);
  context.scale(-1, 1);
  context.drawImage(source, 0, 0, size.width, size.height);
  context.restore();
}
