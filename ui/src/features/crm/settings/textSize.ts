// Text size per account type, chosen in Settings by the owner or an admin. The interface is sized
// in rem, so changing the root font size scales all text (and the spacing sized with it).

export type TextSize = 'normal' | 'large' | 'xlarge';
export type TextSizeRole = 'owner' | 'admin' | 'teacher' | 'student';
export type TextSizes = Record<TextSizeRole, TextSize>;

export const TEXT_SIZE_ROLES: TextSizeRole[] = ['owner', 'admin', 'teacher', 'student'];
export const TEXT_SIZE_OPTIONS: Array<{ value: TextSize; label: string; scale: number }> = [
  { value: 'normal', label: 'Normal', scale: 1 },
  { value: 'large', label: 'Large', scale: 1.15 },
  { value: 'xlarge', label: 'Extra large', scale: 1.3 },
];
export const DEFAULT_TEXT_SIZES: TextSizes = { owner: 'normal', admin: 'normal', teacher: 'normal', student: 'normal' };

const STORAGE_KEY = 'rmc-text-size';
const BASE_FONT_PX = 16;

export const getTextSizeRole = (user: { userType?: string; role?: string } | null | undefined): TextSizeRole | null => {
  if (!user?.userType) return null;
  if (user.userType === 'teacher') return 'teacher';
  if (user.userType === 'student') return 'student';
  return String(user.role || '').toLowerCase() === 'owner' ? 'owner' : 'admin';
};

export const normalizeTextSizes = (value: unknown): TextSizes => {
  const source = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return Object.fromEntries(TEXT_SIZE_ROLES.map((role) => [
    role,
    TEXT_SIZE_OPTIONS.some((option) => option.value === source[role]) ? source[role] : 'normal',
  ])) as TextSizes;
};

/** Sets the root font size; remembered on this device so the next load starts at the right size. */
export const applyTextSize = (size: TextSize) => {
  const scale = TEXT_SIZE_OPTIONS.find((option) => option.value === size)?.scale ?? 1;
  document.documentElement.style.fontSize = scale === 1 ? '' : `${BASE_FONT_PX * scale}px`;
  try {
    localStorage.setItem(STORAGE_KEY, size);
  } catch {
    // Private mode or blocked storage: the size still applies for this visit.
  }
};

export const applyRememberedTextSize = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'large' || saved === 'xlarge') applyTextSize(saved);
  } catch {
    // Nothing remembered.
  }
};
