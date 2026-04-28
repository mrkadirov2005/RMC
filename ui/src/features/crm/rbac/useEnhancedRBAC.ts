// Source file for the rbac area in the crm feature.

import { useAppSelector } from '../hooks/useAppSelector';
import { hasPermission, canAccessRoute, getAccessibleRoutes } from './permissions';
import type { AuthUser } from '../../../types';

interface EnhancedRBACContextType {
  canAccess: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  canAccessRoute: (route: string) => boolean;
  getAccessibleRoutes: () => string[];
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  user: AuthUser | null;
  isSuperuser: boolean;
  isOwner: boolean;
  isCenterAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
}

// Provides enhanced rbac.
export const useEnhancedRBAC = (): EnhancedRBACContextType => {
  const user = useAppSelector((state) => state.auth.user);

// Handles can access.
  const canAccess = (permission: string): boolean => {
    if (!user) return false;
    return hasPermission(user, user.permissions || user.roles || [], permission);
  };

// Handles has role.
  const hasRole = (role: string): boolean => {
    if (!user) return false;
    if ((user.role || user.userType).toLowerCase() === 'owner') return true;
    if (role.toLowerCase() === 'superuser' && user.userType === 'superuser') return true;
    if (user.roles) return user.roles.includes(role);
    return (user.role || user.userType).toLowerCase() === role.toLowerCase();
  };

// Handles can access current route.
  const canAccessCurrentRoute = (route: string): boolean => {
    return canAccessRoute(user, route);
  };

// Returns accessible routes list.
  const getAccessibleRoutesList = (): string[] => {
    return getAccessibleRoutes(user);
  };

// Handles has any permission.
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    if ((user.role || user.userType).toLowerCase() === 'owner') return true;
    
    return permissions.some(permission => canAccess(permission));
  };

// Handles has all permissions.
  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user) return false;
    if ((user.role || user.userType).toLowerCase() === 'owner') return true;
    
    return permissions.every(permission => canAccess(permission));
  };

  const isSuperuser = user?.userType === 'superuser';
// Handles is owner.
  const isOwner = (user?.role || '').toLowerCase() === 'owner';
  const isCenterAdmin = user?.userType === 'superuser' && (user?.role || '').toLowerCase() === 'admin';
  const isTeacher = user?.userType === 'teacher';
  const isStudent = user?.userType === 'student';

  return {
    canAccess,
    hasRole,
    canAccessRoute: canAccessCurrentRoute,
    getAccessibleRoutes: getAccessibleRoutesList,
    hasAnyPermission,
    hasAllPermissions,
    user,
    isSuperuser,
    isOwner,
    isCenterAdmin,
    isTeacher,
    isStudent,
  };
};
