import { describe, expect, it, vi } from 'vitest';

import { CameraController } from './CameraController';

function videoStub(): HTMLVideoElement {
  return {
    readyState: 1,
    play: vi.fn().mockResolvedValue(undefined),
    srcObject: null,
  } as unknown as HTMLVideoElement;
}

function streamStub() {
  const stop = vi.fn();
  return {
    stream: { getTracks: () => [{ stop }] } as unknown as MediaStream,
    stop,
  };
}

describe('CameraController', () => {
  it('restarts the stream and stops old tracks when switching cameras', async () => {
    const first = streamStub();
    const second = streamStub();
    const getUserMedia = vi.fn()
      .mockResolvedValueOnce(first.stream)
      .mockResolvedValueOnce(second.stream);
    const camera = new CameraController({
      video: videoStub(),
      mediaDevices: { getUserMedia } as unknown as MediaDevices,
    });

    await camera.start('user');
    await camera.start('environment');

    expect(first.stop).toHaveBeenCalledOnce();
    expect(getUserMedia).toHaveBeenLastCalledWith(expect.objectContaining({
      video: expect.objectContaining({ facingMode: 'environment' }),
    }));
  });

  it('classifies camera permission denial', async () => {
    const error = new DOMException('blocked', 'NotAllowedError');
    const camera = new CameraController({
      video: videoStub(),
      mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(error) } as unknown as MediaDevices,
    });

    await expect(camera.start('user')).rejects.toMatchObject({ code: 'permission-denied' });
  });
});
