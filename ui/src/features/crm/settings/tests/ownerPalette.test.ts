import { describe, expect, it } from 'vitest';
import { getOwnerPalette, ownerPalettePresets } from '../ownerPalette';

describe('owner panel palette', () => {
  it('provides one source for all three semantic color levels', () => {
    for (const palette of ownerPalettePresets) {
      expect(palette.primary).toMatch(/^#[0-9a-f]{6}$/i);
      expect(palette.secondary).toMatch(/^#[0-9a-f]{6}$/i);
      expect(palette.tertiary).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('falls back to the default palette for an unknown value', () => {
    expect(getOwnerPalette('missing').id).toBe('ocean');
  });

  it('uses the same identifiers accepted by the center setting API', () => {
    expect(ownerPalettePresets.map((palette) => palette.id)).toEqual(['ocean', 'forest', 'sunset', 'royal', 'slate']);
  });

  it('accepts safe custom colors and keeps a custom identity', () => {
    expect(getOwnerPalette({ id: 'custom', primary: '#112233', secondary: '#445566', tertiary: '#fefefe' })).toMatchObject({ id: 'custom', primary: '#112233', secondary: '#445566', tertiary: '#fefefe' });
  });
});
