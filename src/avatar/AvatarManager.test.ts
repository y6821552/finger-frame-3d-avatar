import { describe, expect, it, vi } from 'vitest';

import { AvatarManager } from './AvatarManager';
import { ProceduralAvatar } from './ProceduralAvatar';
import type { Avatar } from './Avatar';
import { roleById, type AvatarRole } from './roles';

describe('AvatarManager', () => {
  it('uses the matching procedural avatar when a licensed VRM fails', async () => {
    const role: AvatarRole = {
      ...roleById('child-female'),
      vrm: {
        url: '/avatars/missing.vrm',
        source: 'https://example.com/avatar',
        author: 'Example Author',
        license: 'CC-BY-4.0',
        redistribution: true,
        modification: true,
      },
    };
    const manager = new AvatarManager({
      loadVrm: vi.fn().mockRejectedValue(new Error('network failed')),
      cacheSize: 1,
    });

    const avatar = await manager.select(role);

    expect(avatar).toBeInstanceOf(ProceduralAvatar);
    expect(avatar.role.id).toBe('child-female');
  });

  it('reuses a cached avatar for the same role', async () => {
    const manager = new AvatarManager({ cacheSize: 2 });
    const role = roleById('adult-male');

    expect(await manager.select(role)).toBe(await manager.select(role));
  });

  it('keeps concurrent licensed avatar loads valid when the user switches quickly', async () => {
    const pending = new Map<string, (avatar: Avatar) => void>();
    const loadVrm = vi.fn((role: AvatarRole) => new Promise<Avatar>((resolve) => pending.set(role.id, resolve)));
    const manager = new AvatarManager({ cacheSize: 2, loadVrm });
    const firstRole = { ...roleById('adult-female'), vrm: licensed('/first.vrm') };
    const secondRole = { ...roleById('senior-male'), vrm: licensed('/second.vrm') };
    const firstAvatar = fakeAvatar(firstRole);
    const secondAvatar = fakeAvatar(secondRole);

    const firstSelection = manager.select(firstRole);
    const secondSelection = manager.select(secondRole);
    pending.get(secondRole.id)?.(secondAvatar);
    expect(await secondSelection).toBe(secondAvatar);
    pending.get(firstRole.id)?.(firstAvatar);
    expect(await firstSelection).toBe(firstAvatar);

    expect(await manager.select(firstRole)).toBe(firstAvatar);
    expect(firstAvatar.dispose).not.toHaveBeenCalled();
  });
});

function licensed(url: string): NonNullable<AvatarRole['vrm']> {
  return {
    url,
    source: 'https://example.com/avatar',
    author: 'Example Author',
    license: 'CC-BY-4.0',
    redistribution: true,
    modification: true,
  };
}

function fakeAvatar(role: AvatarRole): Avatar {
  return {
    kind: 'vrm', role, object3d: new ProceduralAvatar(role).object3d,
    applyPose: vi.fn(), dispose: vi.fn(),
  };
}
