import { useAppSelector } from './useAppSelector';
import type { AuthUser } from '../../../types';
import { hasPermission } from '../rbac/permissions';

interface RBACContextType {
  canAccess: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  user: AuthUser | null;
}

export const useRBAC = (): RBACContextType => {
  const user = useAppSelector((state) => state.auth.user);

  const canAccess = (permission: string): boolean => {
    if (!user) return false;
    return hasPermission(user, user.roles || [], permission);
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    if ((user.role || '').toLowerCase() === 'owner') return true;
    if (user.roles) return user.roles.includes(role);
    return (user.role || '').toLowerCase() === role.toLowerCase();
  };

  return {
    canAccess,
    hasRole,
    user,
  };
};
