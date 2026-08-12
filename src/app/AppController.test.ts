import { Group } from 'three';
import { describe, expect, it, vi } from 'vitest';

import { AppController, type AppControllerDependencies, type AppUiPort } from './AppController';
import { roleById } from '../avatar/roles';
import type { Avatar } from '../avatar/Avatar';
import type { TrackingSource } from '../tracking/types';

function uiPort(): AppUiPort {
  return {
    selectedRole: roleById('adult-female'),
    onRoleChange: vi.fn(() => vi.fn()),
    onQualityChange: vi.fn(() => vi.fn()),
    onCameraChange: vi.fn(() => vi.fn()),
    setStatus: vi.fn(),
    setFps: vi.fn(),
    setQuality: vi.fn(),
    setGestureState: vi.fn(),
    destroy: vi.fn(),
  };
}

function dependencies(sceneEnabled = true) {
  let frameCallback: FrameRequestCallback | null = null;
  const tracking: TrackingSource = {
    mode: 'test',
    start: vi.fn().mockResolvedValue(undefined),
    sample: vi.fn().mockResolvedValue({ timestampMs: 0, hands: [], face: null, pose: null }),
    setSuspended: vi.fn(),
    stop: vi.fn(),
  };
  const avatar: Avatar = {
    kind: 'procedural',
    role: roleById('adult-female'),
    object3d: new Group(),
    applyPose: vi.fn(),
    dispose: vi.fn(),
  };
  const scene = sceneEnabled ? {
    canvas: document.createElement('canvas'),
    setAvatar: vi.fn(),
    render: vi.fn(() => document.createElement('canvas')),
    dispose: vi.fn(),
  } : null;
  const deps: AppControllerDependencies = {
    input: {
      video: document.createElement('video'),
      frame: document.createElement('canvas'),
      mirrored: true,
      width: 640,
      height: 360,
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
    },
    createTracking: vi.fn().mockResolvedValue(tracking),
    avatarManager: { select: vi.fn().mockResolvedValue(avatar), dispose: vi.fn() },
    scene,
    compositor: { setSize: vi.fn(), draw: vi.fn() },
    handMask: { render: vi.fn(() => null) },
    toon: { render: vi.fn(() => document.createElement('canvas')) },
    ui: uiPort(),
    requestFrame: vi.fn((callback) => { frameCallback = callback; return 7; }),
    cancelFrame: vi.fn(),
    now: vi.fn(() => 0),
  };
  return { deps, tracking, scene, getFrameCallback: () => frameCallback };
}

describe('AppController', () => {
  it('starts the input and tracking graph, renders, then releases all resources', async () => {
    const setup = dependencies();
    const app = new AppController(setup.deps);
    await app.start();

    expect(setup.deps.input.start).toHaveBeenCalledWith('user');
    expect(setup.tracking.start).toHaveBeenCalledWith(setup.deps.input.video);
    expect(setup.deps.compositor.setSize).toHaveBeenCalledWith(640, 360);
    setup.getFrameCallback()?.(16);
    await Promise.resolve();
    app.stop();

    expect(setup.deps.input.stop).toHaveBeenCalledOnce();
    expect(setup.tracking.stop).toHaveBeenCalledOnce();
    expect(setup.deps.avatarManager.dispose).toHaveBeenCalledOnce();
    expect(setup.scene?.dispose).toHaveBeenCalledOnce();
    expect(setup.deps.cancelFrame).toHaveBeenCalledWith(7);
  });

  it('renders the Toon fallback when WebGL scene creation failed', async () => {
    const setup = dependencies(false);
    const app = new AppController(setup.deps);
    await app.start();
    setup.getFrameCallback()?.(16);
    await Promise.resolve();

    expect(setup.deps.toon.render).toHaveBeenCalled();
    expect(setup.deps.avatarManager.select).not.toHaveBeenCalled();
    expect(setup.deps.ui.setStatus).toHaveBeenCalledWith(expect.stringContaining('Toon'), 'warning');
    app.stop();
  });

  it('releases the camera and render resources when tracking startup fails', async () => {
    const setup = dependencies();
    setup.deps.createTracking = vi.fn().mockRejectedValue(new Error('model unavailable'));
    const app = new AppController(setup.deps);

    await expect(app.start()).rejects.toThrow('model unavailable');

    expect(setup.deps.input.stop).toHaveBeenCalledOnce();
    expect(setup.deps.avatarManager.dispose).toHaveBeenCalledOnce();
    expect(setup.scene?.dispose).toHaveBeenCalledOnce();
    expect(setup.deps.ui.destroy).not.toHaveBeenCalled();
    app.stop();
    expect(setup.scene?.dispose).toHaveBeenCalledOnce();
    expect(setup.deps.ui.destroy).toHaveBeenCalledOnce();
  });
});
