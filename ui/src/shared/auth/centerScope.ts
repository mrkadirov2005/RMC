// Shared authentication helpers and storage utilities.

import type { AuthUser } from '../../types';
import { getStoredActiveCenterId } from './authStorage';

// Normalizes center id.
const normalizeCenterId = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

// Handles is global superuser.
export const isGlobalSuperuser = (user?: AuthUser | null) =>
  user?.userType === 'superuser' && String(user.role || '').toLowerCase() === 'owner';

// Returns user center id.
export const getUserCenterId = (user?: Pick<AuthUser, 'center_id' | 'branch_id'> | null) =>
  normalizeCenterId(user?.branch_id ?? user?.center_id);

// Returns resolved center id.
export const getResolvedCenterId = (user?: AuthUser | null) => {
  const storedCenterId = getStoredActiveCenterId();
  if (isGlobalSuperuser(user)) {
    return storedCenterId ?? getUserCenterId(user);
  }
  return getUserCenterId(user);
};
