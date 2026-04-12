import type { AuthUser } from '../../types';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const ACTIVE_CENTER_KEY = 'active_center_id';

type StoredAuth = {
  token: string | null;
  user: AuthUser | null;
};

export const getStoredAuth = (): StoredAuth => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);

    if (!token || !rawUser) {
      return { token: null, user: null };
    }

    const user = JSON.parse(rawUser) as AuthUser;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
};

export const setStoredAuth = (token: string, user: AuthUser) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getStoredActiveCenterId = (): number | null => {
  try {
    const raw = localStorage.getItem(ACTIVE_CENTER_KEY);
    if (raw == null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
};

export const setStoredActiveCenterId = (centerId: number | null) => {
  if (centerId && centerId > 0) {
    localStorage.setItem(ACTIVE_CENTER_KEY, String(centerId));
  } else {
    localStorage.removeItem(ACTIVE_CENTER_KEY);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('active-center-changed'));
  }
};

export const clearStoredAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ACTIVE_CENTER_KEY);
};
