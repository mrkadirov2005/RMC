export const OWNER_PALETTE_KEY = 'owner_panel_palette';

export const ownerPalettePresets = [
  { id: 'ocean', name: 'Ocean', primary: '#2563eb', secondary: '#0891b2', tertiary: '#eff6ff' },
  { id: 'forest', name: 'Forest', primary: '#059669', secondary: '#0d9488', tertiary: '#ecfdf5' },
  { id: 'sunset', name: 'Sunset', primary: '#ea580c', secondary: '#db2777', tertiary: '#fff7ed' },
  { id: 'royal', name: 'Royal', primary: '#7c3aed', secondary: '#c026d3', tertiary: '#f5f3ff' },
  { id: 'slate', name: 'Slate', primary: '#334155', secondary: '#64748b', tertiary: '#f1f5f9' },
] as const;

export type OwnerPaletteId = typeof ownerPalettePresets[number]['id'];
export type OwnerPalette = { id: string; name?: string; primary: string; secondary: string; tertiary: string };
export const DEFAULT_OWNER_PALETTE: OwnerPaletteId = 'ocean';

export const getOwnerPalette = (value?: string | Partial<OwnerPalette> | null): OwnerPalette => {
  const id = typeof value === 'string' ? value : value?.id;
  const preset = ownerPalettePresets.find((palette) => palette.id === id) || ownerPalettePresets[0];
  if (!value || typeof value === 'string') return { ...preset };
  const hex = (color: unknown, fallback: string) => /^#[0-9a-f]{6}$/i.test(String(color)) ? String(color) : fallback;
  return { id: id || 'custom', name: value.name, primary: hex(value.primary, preset.primary), secondary: hex(value.secondary, preset.secondary), tertiary: hex(value.tertiary, preset.tertiary) };
};

export const readOwnerPalette = () => {
  try {
    const stored = localStorage.getItem(OWNER_PALETTE_KEY);
    if (!stored) return getOwnerPalette(DEFAULT_OWNER_PALETTE);
    try { return getOwnerPalette(JSON.parse(stored)); } catch { return getOwnerPalette(stored); }
  } catch {
    return getOwnerPalette(DEFAULT_OWNER_PALETTE);
  }
};

export const applyOwnerPalette = (value: string | Partial<OwnerPalette>) => {
  const palette = getOwnerPalette(value);
  document.documentElement.style.setProperty('--owner-primary-card', palette.primary);
  document.documentElement.style.setProperty('--owner-secondary-tag', palette.secondary);
  document.documentElement.style.setProperty('--owner-tertiary-card', palette.tertiary);
  return palette;
};

export const saveOwnerPalette = (value: string | Partial<OwnerPalette>) => {
  const palette = applyOwnerPalette(value);
  localStorage.setItem(OWNER_PALETTE_KEY, JSON.stringify(palette));
  return palette;
};

export const initializeOwnerPalette = () => applyOwnerPalette(readOwnerPalette());
