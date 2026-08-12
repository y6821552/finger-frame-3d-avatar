import type { Avatar } from './Avatar';
import { ProceduralAvatar } from './ProceduralAvatar';
import type { AvatarRole } from './roles';

export interface AvatarManagerOptions {
  loadVrm?: (role: AvatarRole) => Promise<Avatar>;
  cacheSize?: number;
}

export class AvatarManager {
  private readonly loadVrm: (role: AvatarRole) => Promise<Avatar>;
  private readonly cacheSize: number;
  private readonly cache = new Map<string, Avatar>();
  private generation = 0;

  constructor(options: AvatarManagerOptions = {}) {
    this.loadVrm = options.loadVrm ?? (async (role) => {
      const { loadVrmAvatar } = await import('./VrmAvatar');
      return loadVrmAvatar(role);
    });
    this.cacheSize = Math.max(1, options.cacheSize ?? (isMobileDevice() ? 1 : 2));
  }

  async select(role: AvatarRole): Promise<Avatar> {
    const cached = this.cache.get(role.id);
    if (cached) {
      this.cache.delete(role.id);
      this.cache.set(role.id, cached);
      return cached;
    }

    const generation = this.generation;
    let avatar: Avatar;
    try {
      avatar = role.vrm ? await this.loadVrm(role) : new ProceduralAvatar(role);
    } catch {
      avatar = new ProceduralAvatar(role);
    }
    if (generation !== this.generation) {
      avatar.dispose();
      return avatar;
    }
    this.cache.set(role.id, avatar);
    this.trimCache();
    return avatar;
  }

  dispose(): void {
    this.generation += 1;
    this.cache.forEach((avatar) => avatar.dispose());
    this.cache.clear();
  }

  private trimCache(): void {
    while (this.cache.size > this.cacheSize) {
      const oldest = this.cache.entries().next().value as [string, Avatar] | undefined;
      if (!oldest) return;
      this.cache.delete(oldest[0]);
      oldest[1].dispose();
    }
  }
}

function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
