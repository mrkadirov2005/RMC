export const OWNER_PALETTE_KEY = 'owner_panel_palette';

export const ownerPalettePresets = [
  { id: 'ocean', name: 'Electric Ocean', primary: '#0066ff', secondary: '#00c2ff', tertiary: '#eaf3ff' },
  { id: 'forest', name: 'Neon Forest', primary: '#00c853', secondary: '#00e5a8', tertiary: '#e8fff3' },
  { id: 'sunset', name: 'Vivid Sunset', primary: '#ff5a00', secondary: '#ff1493', tertiary: '#fff0e6' },
  { id: 'royal', name: 'Electric Royal', primary: '#7a00ff', secondary: '#e000ff', tertiary: '#f4eaff' },
  { id: 'slate', name: 'Bright Graphite', primary: '#364cff', secondary: '#647dff', tertiary: '#eef0ff' },
] as const;

export type OwnerPaletteId = typeof ownerPalettePresets[number]['id'];
export type OwnerPalette = { id: string; name?: string; primary: string; secondary: string; tertiary: string };
export const DEFAULT_OWNER_PALETTE: OwnerPaletteId = 'ocean';

export const getReadableTextColor = (hexColor: string) => {
  const hex = String(hexColor || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return '#ffffff';
  const [red, green, blue] = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.62 ? '#111827' : '#ffffff';
};

export const getOwnerPalette = (value?: string | Partial<OwnerPalette> | null): OwnerPalette => {
  const id = typeof value === 'string' ? value : value?.id;
  const preset = ownerPalettePresets.find((palette) => palette.id === id) || ownerPalettePresets[0];
  if (!value || typeof value === 'string') return { ...preset };
  if (ownerPalettePresets.some((palette) => palette.id === id)) return { ...preset };
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
  document.documentElement.style.setProperty('--owner-primary-text', getReadableTextColor(palette.primary));
  document.documentElement.style.setProperty('--owner-secondary-text', getReadableTextColor(palette.secondary));
  document.documentElement.style.setProperty('--owner-tertiary-text', getReadableTextColor(palette.tertiary));
  return palette;
};

export const saveOwnerPalette = (value: string | Partial<OwnerPalette>) => {
  const palette = applyOwnerPalette(value);
  localStorage.setItem(OWNER_PALETTE_KEY, JSON.stringify(palette));
  return palette;
};

export const initializeOwnerPalette = () => applyOwnerPalette(readOwnerPalette());
