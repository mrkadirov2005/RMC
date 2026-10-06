// React hooks for the crm feature.

import { useAppSelector } from './useAppSelector';
import type { AuthUser } from '../../../types';
import { hasPermission } from '../rbac/permissions';
import { canAccessSubPage } from '../rbac/adminPageAccess';

interface RBACContextType {
  canAccess: (permission: string) => boolean;
  /** Whether a sidebar submenu (e.g. Salary → Monthly) is open to this user; owners see all. */
  canAccessSubPage: (parentPermission: string, childPermission: string) => boolean;
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

  const canAccessSubPageForUser = (parentPermission: string, childPermission: string): boolean => {
    if (!user) return false;
    if ((user.role || '').toLowerCase() === 'owner') return true;
    return canAccessSubPage(user.permissions || user.roles || [], parentPermission, childPermission);
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
    canAccessSubPage: canAccessSubPageForUser,
    hasRole,
    user,
  };
};
