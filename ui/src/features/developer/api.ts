import { apiClient, ownerAPI } from '@/shared/api/api';

export type LockUserType = 'owner' | 'superuser' | 'teacher' | 'student' | 'parent';

export interface DeveloperAccount {
  user_type: LockUserType;
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  center_id: number | null;
  status: string | null;
  locked: boolean;
  lock_reason: string | null;
  locked_at: string | null;
}

export interface DeveloperLock {
  user_type: LockUserType;
  user_id: number;
  reason: string | null;
  locked_at: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
}

export interface Lockdown {
  enabled: boolean;
  reason: string | null;
  locked_at: string | null;
}

export interface DeveloperOwner {
  owner_id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  status: string | null;
  is_locked: boolean;
  login_attempts: number;
  last_login: string | null;
  is_developer: boolean;
}

// The developer account only; the server refuses everyone else.
export const developerAPI = {
  accounts: (type: LockUserType, q: string) => apiClient.get('/developer/accounts', { params: { type, q } }),
  locks: () => apiClient.get('/developer/locks'),
  lock: (user_type: LockUserType, user_id: number, reason?: string) => apiClient.post('/developer/locks', { user_type, user_id, reason }),
  unlock: (userType: LockUserType, userId: number) => apiClient.delete(`/developer/locks/${userType}/${userId}`),
  setLockdown: (enabled: boolean, reason?: string) => apiClient.put('/developer/lockdown', { enabled, reason }),
  owners: () => apiClient.get('/developer/owners'),
  unlockOwner: (ownerId: number) => apiClient.post(`/developer/owners/${ownerId}/unlock`),
  resetOwnerPassword: (ownerId: number, password: string) => apiClient.post(`/developer/owners/${ownerId}/password`, { password }),
  createOwner: (data: { username: string; password: string; first_name: string; last_name: string; email: string }) => ownerAPI.create(data),
};
