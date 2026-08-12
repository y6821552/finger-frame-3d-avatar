export const AGE_GROUPS = ['child', 'teen', 'adult', 'senior'] as const;
export const GENDERS = ['male', 'female'] as const;

export type AgeGroup = (typeof AGE_GROUPS)[number];
export type Gender = (typeof GENDERS)[number];
export type RoleId = `${AgeGroup}-${Gender}`;

export interface SceneTheme {
  id: AgeGroup;
  sky: string;
  wall: string;
  floor: string;
  accent: string;
  secondary: string;
}

export interface ProceduralAvatarConfig {
  skin: string;
  hair: string;
  outfit: string;
  accent: string;
  headScale: number;
  shoulderScale: number;
  hairStyle: 'crop' | 'sweep' | 'bob' | 'waves' | 'silver-crop' | 'silver-bob';
}

export interface LicensedAsset {
  url: string;
  source: string;
  author: string;
  license: string;
  redistribution: true;
  modification: true;
}

export interface AvatarRole {
  id: RoleId;
  age: AgeGroup;
  gender: Gender;
  label: string;
  theme: SceneTheme;
  fallback: ProceduralAvatarConfig;
  vrm?: LicensedAsset;
}

const THEMES: Record<AgeGroup, SceneTheme> = {
  child: {
    id: 'child',
    sky: '#a9e8ff',
    wall: '#ffe6b9',
    floor: '#d9b8ff',
    accent: '#ff7fa8',
    secondary: '#6fd8c2',
  },
  teen: {
    id: 'teen',
    sky: '#7597ff',
    wall: '#252e55',
    floor: '#171d36',
    accent: '#fb6fff',
    secondary: '#6fffe1',
  },
  adult: {
    id: 'adult',
    sky: '#ffc9a9',
    wall: '#5b3447',
    floor: '#2d2030',
    accent: '#ffc368',
    secondary: '#83d9d2',
  },
  senior: {
    id: 'senior',
    sky: '#a8d8d0',
    wall: '#334a48',
    floor: '#1d2f30',
    accent: '#e8c982',
    secondary: '#8fb6a8',
  },
};

function role(
  age: AgeGroup,
  gender: Gender,
  label: string,
  fallback: ProceduralAvatarConfig,
): AvatarRole {
  return { id: `${age}-${gender}`, age, gender, label, theme: THEMES[age], fallback };
}

export const ROLES: readonly AvatarRole[] = [
  role('child', 'male', 'Child · Boy', {
    skin: '#f1b894', hair: '#3b281f', outfit: '#4f9ee8', accent: '#ffd55f',
    headScale: 1.18, shoulderScale: 0.82, hairStyle: 'crop',
  }),
  role('child', 'female', 'Child · Girl', {
    skin: '#edb18f', hair: '#5a3528', outfit: '#ef76a7', accent: '#7de1c5',
    headScale: 1.18, shoulderScale: 0.8, hairStyle: 'bob',
  }),
  role('teen', 'male', 'Teen · Boy', {
    skin: '#c98e69', hair: '#221c26', outfit: '#6759d9', accent: '#6fffe1',
    headScale: 1.08, shoulderScale: 0.94, hairStyle: 'sweep',
  }),
  role('teen', 'female', 'Teen · Girl', {
    skin: '#d99b79', hair: '#2d2132', outfit: '#b34ec2', accent: '#65e6ff',
    headScale: 1.08, shoulderScale: 0.9, hairStyle: 'waves',
  }),
  role('adult', 'male', 'Adult · Man', {
    skin: '#bb7d5d', hair: '#302522', outfit: '#315b75', accent: '#ffc368',
    headScale: 1, shoulderScale: 1.08, hairStyle: 'crop',
  }),
  role('adult', 'female', 'Adult · Woman', {
    skin: '#d69773', hair: '#241c25', outfit: '#7e405f', accent: '#83d9d2',
    headScale: 1.02, shoulderScale: 1, hairStyle: 'bob',
  }),
  role('senior', 'male', 'Senior · Man', {
    skin: '#bb896e', hair: '#d5d2cd', outfit: '#496b63', accent: '#e8c982',
    headScale: 1.01, shoulderScale: 1.02, hairStyle: 'silver-crop',
  }),
  role('senior', 'female', 'Senior · Woman', {
    skin: '#c99377', hair: '#ddd7d2', outfit: '#69566c', accent: '#e8c982',
    headScale: 1.01, shoulderScale: 0.96, hairStyle: 'silver-bob',
  }),
] as const;

export const DEFAULT_ROLE_ID: RoleId = 'adult-female';

export function findRole(age: AgeGroup, gender: Gender): AvatarRole {
  return ROLES.find((candidate) => candidate.age === age && candidate.gender === gender) ??
    roleById(DEFAULT_ROLE_ID);
}

export function roleById(id: string): AvatarRole {
  return ROLES.find((candidate) => candidate.id === id) ??
    (ROLES.find((candidate) => candidate.id === DEFAULT_ROLE_ID) as AvatarRole);
}

export function loadSavedRole(storage: Pick<Storage, 'getItem'>): AvatarRole {
  return roleById(storage.getItem('finger-frame-role') ?? DEFAULT_ROLE_ID);
}
