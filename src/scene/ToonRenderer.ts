import type { AvatarRole } from '../avatar/roles';
import type { AvatarPose } from '../motion/types';
import type { Size } from '../tracking/types';

export class ToonRenderer {
  private readonly context: CanvasRenderingContext2D;

  constructor(readonly canvas = document.createElement('canvas'), context?: CanvasRenderingContext2D) {
    const resolved = context ?? canvas.getContext('2d');
    if (!resolved) throw new Error('Toon fallback requires Canvas 2D');
    this.context = resolved;
  }

  render(
    camera: CanvasImageSource,
    role: AvatarRole,
    pose: AvatarPose,
    size: Size,
    nowMs: number,
  ): HTMLCanvasElement {
    void camera;
    if (this.canvas.width !== size.width || this.canvas.height !== size.height) {
      this.canvas.width = size.width;
      this.canvas.height = size.height;
    }
    const context = this.context;
    const { width, height } = size;
    context.clearRect(0, 0, width, height);
    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, role.theme.sky);
    background.addColorStop(1, role.theme.wall);
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
    context.globalAlpha = 0.28;
    context.fillStyle = role.theme.secondary;
    for (let index = 0; index < 8; index += 1) {
      context.beginPath();
      context.arc(
        width * (0.12 + (index % 4) * 0.25),
        height * (0.16 + Math.floor(index / 4) * 0.62) + Math.sin(nowMs / 600 + index) * 8,
        Math.max(8, width * 0.013),
        0,
        Math.PI * 2,
      );
      context.fill();
    }
    context.globalAlpha = 1;
    drawBust(context, role, pose, size);
    return this.canvas;
  }
}

function drawBust(context: CanvasRenderingContext2D, role: AvatarRole, pose: AvatarPose, size: Size): void {
  const unit = Math.min(size.width, size.height);
  const centerX = size.width / 2 + pose.anchorX * unit * 0.18;
  const headY = size.height * 0.39 - pose.anchorY * unit * 0.18;
  context.save();
  context.translate(centerX, headY);
  context.scale(pose.avatarScale, pose.avatarScale);
  context.rotate(pose.head.z * 0.7);

  context.fillStyle = role.fallback.outfit;
  context.beginPath();
  context.ellipse(0, unit * 0.47, unit * 0.32 * role.fallback.shoulderScale, unit * 0.28, 0, 0, Math.PI * 2);
  context.fill();

  const headWidth = unit * 0.18 * role.fallback.headScale;
  const headHeight = unit * 0.225 * role.fallback.headScale;
  context.fillStyle = role.fallback.hair;
  context.beginPath();
  context.ellipse(0, -unit * 0.03, headWidth * 1.12, headHeight * 1.12, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = role.fallback.skin;
  context.beginPath();
  context.ellipse(0, 0, headWidth, headHeight, 0, 0, Math.PI * 2);
  context.fill();

  if (role.fallback.hairStyle.includes('bob') || role.fallback.hairStyle === 'waves') {
    context.fillStyle = role.fallback.hair;
    context.beginPath();
    context.ellipse(-headWidth * 0.86, unit * 0.04, headWidth * 0.34, headHeight * 0.82, -0.1, 0, Math.PI * 2);
    context.ellipse(headWidth * 0.86, unit * 0.04, headWidth * 0.34, headHeight * 0.82, 0.1, 0, Math.PI * 2);
    context.fill();
  }

  const eyeY = -unit * 0.025;
  const eyeX = headWidth * 0.43;
  context.strokeStyle = '#241d25';
  context.lineWidth = Math.max(2, unit * 0.014);
  context.lineCap = 'round';
  drawEye(context, -eyeX, eyeY, 1 - pose.blinkLeft);
  drawEye(context, eyeX, eyeY, 1 - pose.blinkRight);

  context.fillStyle = role.fallback.accent;
  context.beginPath();
  context.ellipse(0, headHeight * 0.45, headWidth * (0.18 + pose.smile * 0.12), unit * (0.012 + pose.mouthOpen * 0.04), 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = role.fallback.hair;
  context.beginPath();
  context.ellipse(0, -headHeight * 0.78, headWidth * 0.96, headHeight * 0.37, -pose.head.y * 0.25, Math.PI, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawEye(context: CanvasRenderingContext2D, x: number, y: number, openness: number): void {
  context.beginPath();
  context.moveTo(x - 9, y);
  context.quadraticCurveTo(x, y - 8 * Math.max(0.08, openness), x + 9, y);
  context.stroke();
}
