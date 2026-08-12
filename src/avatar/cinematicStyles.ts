import type { AvatarRole, RoleId } from './roles';

export interface CinematicAvatarStyle {
  readonly artDirection: 'cinematic-soft';
  readonly face: {
    readonly width: number;
    readonly height: number;
    readonly depth: number;
    readonly headScale: number;
    readonly cheekFullness: number;
  };
  readonly eye: {
    readonly scale: number;
    readonly spacing: number;
    readonly irisScale: number;
  };
  readonly hair: {
    readonly silhouette: 'crop' | 'swept' | 'bob' | 'waves' | 'soft-crop' | 'silver-bob';
    readonly layers: number;
    readonly volume: number;
    readonly length: number;
  };
  readonly palette: {
    readonly skin: string;
    readonly skinShadow: string;
    readonly blush: string;
    readonly iris: string;
    readonly hair: string;
    readonly outfit: string;
    readonly accent: string;
  };
  readonly shoulderScale: number;
  readonly ageDetail: number;
}

const SHAPES: Record<RoleId, Pick<CinematicAvatarStyle, 'face' | 'eye' | 'hair' | 'shoulderScale' | 'ageDetail'>> = {
  'child-male': shape(1.17, 1.01, 'soft-crop', 0.86, 0),
  'child-female': shape(1.18, 1.03, 'bob', 0.84, 0),
  'teen-male': shape(1.08, 0.94, 'swept', 0.96, 0.03),
  'teen-female': shape(1.09, 0.96, 'waves', 0.92, 0.03),
  'adult-male': shape(1, 0.9, 'crop', 1.08, 0.08),
  'adult-female': shape(1.02, 0.92, 'bob', 1, 0.06),
  'senior-male': shape(1.01, 0.88, 'soft-crop', 1.03, 0.42),
  'senior-female': shape(1.02, 0.9, 'silver-bob', 0.98, 0.4),
};

export function cinematicStyleFor(role: AvatarRole): CinematicAvatarStyle {
  const profile = SHAPES[role.id];
  const skin = mixHex(role.fallback.skin, '#ffd7c2', 0.25);
  return {
    artDirection: 'cinematic-soft',
    ...profile,
    palette: {
      skin,
      skinShadow: mixHex(skin, '#9f6267', 0.13),
      blush: mixHex(skin, '#e98291', 0.34),
      iris: role.gender === 'female' ? '#51406f' : '#31556b',
      hair: role.fallback.hair,
      outfit: role.fallback.outfit,
      accent: role.fallback.accent,
    },
  };
}

function shape(
  headScale: number,
  eyeScale: number,
  silhouette: CinematicAvatarStyle['hair']['silhouette'],
  shoulderScale: number,
  ageDetail: number,
): Pick<CinematicAvatarStyle, 'face' | 'eye' | 'hair' | 'shoulderScale' | 'ageDetail'> {
  return {
    face: {
      width: silhouette === 'crop' || silhouette === 'soft-crop' ? 0.91 : 0.94,
      height: 1.04,
      depth: 0.9,
      headScale,
      cheekFullness: Math.max(0.86, 1.04 - ageDetail * 0.22),
    },
    eye: { scale: eyeScale, spacing: 0.29, irisScale: 1.02 + eyeScale * 0.08 },
    hair: {
      silhouette,
      layers: silhouette === 'waves' || silhouette === 'silver-bob' ? 5 : 4,
      volume: silhouette === 'waves' ? 1.1 : 1,
      length: silhouette === 'bob' || silhouette === 'silver-bob' ? 0.78 : silhouette === 'waves' ? 0.92 : 0.38,
    },
    shoulderScale,
    ageDetail,
  };
}

function mixHex(from: string, to: string, amount: number): string {
  const parse = (color: string) => [1, 3, 5].map((start) => Number.parseInt(color.slice(start, start + 2), 16));
  const a = parse(from);
  const b = parse(to);
  return `#${a.map((value, index) => Math.round(value + ((b[index] ?? value) - value) * amount)
    .toString(16).padStart(2, '0')).join('')}`;
}
