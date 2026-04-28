// React hooks for the crm feature.

import { useAppSelector } from './useAppSelector';
import type { AuthUser } from '../../../types';
import { hasPermission } from '../rbac/permissions';

interface RBACContextType {
  canAccess: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  user: AuthUser | null;
}

// Provides rbac.
export const useRBAC = (): RBACContextType => {
  const user = useAppSelector((state) => state.auth.user);

// Handles can access.
  const canAccess = (permission: string): boolean => {
    if (!user) return false;
    return hasPermission(user, user.permissions || user.roles || [], permission);
  };

// Handles has role.
  const hasRole = (role: string): boolean => {
    if (!user) return false;
    if ((user.role || '').toLowerCase() === 'owner') return true;
    if (role.toLowerCase() === 'superuser' && user.userType === 'superuser') return true;
    if (user.roles) return user.roles.includes(role);
    return (user.role || user.userType).toLowerCase() === role.toLowerCase();
  };

  return {
    canAccess,
    hasRole,
    user,
  };
};
