import { describe, expect, it } from 'vitest';

import { DEFAULT_ROLE_ID, ROLES, findRole, loadSavedRole } from './roles';

describe('avatar role manifest', () => {
  it('contains every age and gender pair exactly once', () => {
    expect(ROLES).toHaveLength(8);
    expect(new Set(ROLES.map((role) => role.id)).size).toBe(8);
    expect(ROLES.map((role) => `${role.age}:${role.gender}`).sort()).toEqual([
      'adult:female',
      'adult:male',
      'child:female',
      'child:male',
      'senior:female',
      'senior:male',
      'teen:female',
      'teen:male',
    ]);
  });

  it('provides a procedural fallback for every role', () => {
    for (const role of ROLES) {
      expect(role.fallback.skin).toMatch(/^#/);
      expect(role.fallback.hair).toMatch(/^#/);
      expect(role.fallback.outfit).toMatch(/^#/);
    }
  });

  it('requires complete attribution for configured VRM assets', () => {
    for (const role of ROLES) {
      if (!role.vrm) continue;
      expect(role.vrm.source).toMatch(/^https:/);
      expect(role.vrm.author.length).toBeGreaterThan(0);
      expect(role.vrm.license.length).toBeGreaterThan(0);
      expect(role.vrm.redistribution).toBe(true);
      expect(role.vrm.modification).toBe(true);
    }
  });

  it('restores valid selection and falls back from invalid storage', () => {
    const valid = { getItem: () => 'child-male' };
    const invalid = { getItem: () => 'unknown-role' };

    expect(loadSavedRole(valid).id).toBe('child-male');
    expect(loadSavedRole(invalid).id).toBe(DEFAULT_ROLE_ID);
    expect(findRole('senior', 'female').id).toBe('senior-female');
  });
});
