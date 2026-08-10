export const OWNER_PALETTE_KEY = 'owner_panel_palette';

export const ownerPalettePresets = [
  { id: 'ocean', name: 'Ocean', primary: '#2563eb', secondary: '#0891b2', tertiary: '#eff6ff' },
  { id: 'forest', name: 'Forest', primary: '#059669', secondary: '#0d9488', tertiary: '#ecfdf5' },
  { id: 'sunset', name: 'Sunset', primary: '#ea580c', secondary: '#db2777', tertiary: '#fff7ed' },
  { id: 'royal', name: 'Royal', primary: '#7c3aed', secondary: '#c026d3', tertiary: '#f5f3ff' },
  { id: 'slate', name: 'Slate', primary: '#334155', secondary: '#64748b', tertiary: '#f1f5f9' },
] as const;

export type OwnerPaletteId = typeof ownerPalettePresets[number]['id'];
export const DEFAULT_OWNER_PALETTE: OwnerPaletteId = 'ocean';

export const getOwnerPalette = (id?: string | null) =>
  ownerPalettePresets.find((palette) => palette.id === id) || ownerPalettePresets[0];

export const readOwnerPalette = () => {
  try {
    return getOwnerPalette(localStorage.getItem(OWNER_PALETTE_KEY));
  } catch {
    return getOwnerPalette(DEFAULT_OWNER_PALETTE);
  }
};

export const applyOwnerPalette = (id: string) => {
  const palette = getOwnerPalette(id);
  document.documentElement.style.setProperty('--owner-primary-card', palette.primary);
  document.documentElement.style.setProperty('--owner-secondary-tag', palette.secondary);
  document.documentElement.style.setProperty('--owner-tertiary-card', palette.tertiary);
  return palette;
};

export const saveOwnerPalette = (id: string) => {
  const palette = applyOwnerPalette(id);
  localStorage.setItem(OWNER_PALETTE_KEY, palette.id);
  return palette;
};

export const initializeOwnerPalette = () => applyOwnerPalette(readOwnerPalette().id);
