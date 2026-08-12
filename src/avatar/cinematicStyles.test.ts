import { describe, expect, it } from 'vitest';

import { cinematicStyleFor } from './cinematicStyles';
import { ROLES } from './roles';

describe('cinematicStyleFor', () => {
  it('provides a complete coherent style for every selectable role', () => {
    expect(ROLES).toHaveLength(8);

    for (const role of ROLES) {
      const style = cinematicStyleFor(role);
      expect(style.artDirection).toBe('cinematic-soft');
      expect(style.face.width).toBeGreaterThan(0.7);
      expect(style.face.height).toBeGreaterThan(0.8);
      expect(style.eye.scale).toBeGreaterThan(0.8);
      expect(style.hair.layers).toBeGreaterThanOrEqual(3);
      expect(style.palette.skin).toMatch(/^#[0-9a-f]{6}$/i);
      expect(style.palette.iris).toMatch(/^#[0-9a-f]{6}$/i);
      expect(style.palette.hair).toMatch(/^#[0-9a-f]{6}$/i);
      expect(style.palette.outfit).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('uses subtle age proportions while preserving one art direction', () => {
    const child = cinematicStyleFor(ROLES.find((role) => role.id === 'child-female')!);
    const adult = cinematicStyleFor(ROLES.find((role) => role.id === 'adult-female')!);
    const senior = cinematicStyleFor(ROLES.find((role) => role.id === 'senior-female')!);

    expect(child.face.headScale).toBeGreaterThan(adult.face.headScale);
    expect(child.eye.scale).toBeGreaterThan(adult.eye.scale);
    expect(senior.ageDetail).toBeGreaterThan(adult.ageDetail);
    expect(new Set([child.hair.silhouette, adult.hair.silhouette, senior.hair.silhouette]).size)
      .toBeGreaterThan(1);
    expect([child.artDirection, adult.artDirection, senior.artDirection])
      .toEqual(['cinematic-soft', 'cinematic-soft', 'cinematic-soft']);
  });
});
