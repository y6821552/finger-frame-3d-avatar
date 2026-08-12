export type FacingMode = 'user' | 'environment';
export type CameraErrorCode = 'permission-denied' | 'not-found' | 'unavailable';

export class CameraError extends Error {
  constructor(readonly code: CameraErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CameraError';
  }
}

export interface CameraControllerOptions {
  video?: HTMLVideoElement;
  mediaDevices?: MediaDevices;
}

export class CameraController {
  readonly video: HTMLVideoElement;
  private readonly mediaDevices: MediaDevices;
  private stream: MediaStream | null = null;

  constructor(options: CameraControllerOptions = {}) {
    this.video = options.video ?? document.createElement('video');
    const mediaDevices = options.mediaDevices ?? navigator.mediaDevices;
    if (!mediaDevices) throw new CameraError('unavailable', 'This browser does not expose camera APIs');
    this.mediaDevices = mediaDevices;
    this.video.autoplay = true;
    this.video.muted = true;
    this.video.playsInline = true;
  }

  async start(facingMode: FacingMode): Promise<HTMLVideoElement> {
    this.stopStream();
    try {
      this.stream = await this.requestStream(facingMode);
      this.video.srcObject = this.stream;
      if (this.video.readyState < 1) {
        await new Promise<void>((resolve, reject) => {
          this.video.onloadedmetadata = () => resolve();
          this.video.onerror = () => reject(new CameraError('unavailable', 'Camera metadata failed'));
        });
      }
      await this.video.play();
      return this.video;
    } catch (error) {
      this.stopStream();
      throw classifyCameraError(error);
    }
  }

  stop(): void {
    this.stopStream();
  }

  private async requestStream(facingMode: FacingMode): Promise<MediaStream> {
    try {
      return await this.mediaDevices.getUserMedia({
        video: { width: { ideal: 1_280 }, height: { ideal: 720 }, facingMode },
        audio: false,
      });
    } catch (error) {
      if (!(error instanceof DOMException) || !['OverconstrainedError', 'NotFoundError'].includes(error.name)) {
        throw error;
      }
      return this.mediaDevices.getUserMedia({ video: true, audio: false });
    }
  }

  private stopStream(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.srcObject = null;
  }
}

function classifyCameraError(error: unknown): CameraError {
  if (error instanceof CameraError) return error;
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return new CameraError('permission-denied', 'Camera permission was denied', { cause: error });
    }
    if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
      return new CameraError('not-found', 'No compatible camera was found', { cause: error });
    }
  }
  return new CameraError('unavailable', 'The camera could not be started', { cause: error });
}
