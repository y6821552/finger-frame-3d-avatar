import './styles.css';

import { AppController } from './app/AppController';
import { AvatarManager } from './avatar/AvatarManager';
import { CameraController, CameraError } from './camera/CameraController';
import { BrowserFrameInput, DemoFrameInput } from './camera/FrameInput';
import { FrameCompositor } from './compositor/FrameCompositor';
import { HandMask } from './compositor/HandMask';
import { CartoonScene } from './scene/CartoonScene';
import { ToonRenderer } from './scene/ToonRenderer';
import { DemoTrackingSource } from './tracking/DemoTrackingSource';
import { FallbackTrackingSource } from './tracking/FallbackTrackingSource';
import {
  createWorkerTrackingSource,
  supportsWorkerTracking,
} from './tracking/WorkerTrackingSource';
import type { TrackingSource } from './tracking/types';
import { AppUI } from './ui/AppUI';

const output = requireElement<HTMLCanvasElement>('#output');
const video = requireElement<HTMLVideoElement>('#camera');
const controls = requireElement<HTMLElement>('#controls');
const loading = requireElement<HTMLElement>('#loading');
const loadingMessage = requireElement<HTMLElement>('#loading-message');
const parameters = new URLSearchParams(location.search);
const demoMode = parameters.has('demo');
const mobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const ui = new AppUI(controls, localStorage);
const input = demoMode
  ? new DemoFrameInput(mobileDevice ? { width: 640, height: 360 } : {})
  : new BrowserFrameInput(new CameraController({ video }));
const compositor = new FrameCompositor(output);
const handMask = new HandMask();
const toon = new ToonRenderer();
let scene: CartoonScene | null = null;

if (!parameters.has('noWebgl')) {
  try {
    scene = new CartoonScene();
  } catch (error) {
    console.warn('WebGL scene unavailable; using Canvas Toon fallback.', error);
  }
}

const createTracking = async (): Promise<TrackingSource> => {
  if (demoMode) return new DemoTrackingSource();
  if (supportsWorkerTracking()) {
    return new FallbackTrackingSource(
      createWorkerTrackingSource(),
      createMainThreadTracking,
    );
  }
  return createMainThreadTracking();
};

const createMainThreadTracking = async (): Promise<TrackingSource> => {
  const { TrackingPipeline } = await import('./tracking/TrackingPipeline');
  return TrackingPipeline.create();
};

const app = new AppController({
  input,
  createTracking,
  avatarManager: new AvatarManager(),
  scene,
  compositor,
  handMask,
  toon,
  ui,
});

void app.start().then(() => {
  document.documentElement.dataset.appReady = 'true';
  document.documentElement.dataset.mode = demoMode ? 'demo' : 'camera';
  loading.dataset.state = 'ready';
}).catch((error: unknown) => {
  const message = startupMessage(error);
  ui.setStatus(message, 'error');
  loading.dataset.state = 'error';
  loadingMessage.replaceChildren(document.createTextNode(`${message} `), demoLink());
});

window.addEventListener('pagehide', () => app.stop(), { once: true });

function startupMessage(error: unknown): string {
  if (error instanceof CameraError) {
    if (error.code === 'permission-denied') {
      return 'Camera blocked. Allow camera access in browser settings, then reload.';
    }
    if (error.code === 'not-found') return 'No camera was found on this device.';
  }
  if (error instanceof Error) return error.message;
  return 'The local experience could not start.';
}

function demoLink(): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = '?demo=1';
  link.textContent = 'Open permission-free demo';
  return link;
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing application element: ${selector}`);
  return element;
}
