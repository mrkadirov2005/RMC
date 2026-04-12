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

export const useEnhancedRBAC = (): EnhancedRBACContextType => {
  const user = useAppSelector((state) => state.auth.user);

  const canAccess = (permission: string): boolean => {
    if (!user) return false;
    return hasPermission(user, user.roles || [], permission);
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    if ((user.role || user.userType).toLowerCase() === 'owner') return true;
    if (user.roles) return user.roles.includes(role);
    return (user.role || '').toLowerCase() === role.toLowerCase();
  };

  const canAccessCurrentRoute = (route: string): boolean => {
    return canAccessRoute(user, route);
  };

  const getAccessibleRoutesList = (): string[] => {
    return getAccessibleRoutes(user);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    if ((user.role || user.userType).toLowerCase() === 'owner') return true;
    
    return permissions.some(permission => canAccess(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user) return false;
    if ((user.role || user.userType).toLowerCase() === 'owner') return true;
    
    return permissions.every(permission => canAccess(permission));
  };

  const isSuperuser = user?.userType === 'superuser';
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
