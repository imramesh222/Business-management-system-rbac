export type UserRole = 
  | 'superadmin' 
  | 'admin' 
  | 'project_manager' 
  | 'developer' 
  | 'verifier' 
  | 'salesperson' 
  | 'support' 
  | 'user';

export const ROLES = {
  SUPERADMIN: 'superadmin' as UserRole,
  ADMIN: 'admin' as UserRole,
  PROJECT_MANAGER: 'project_manager' as UserRole,
  DEVELOPER: 'developer' as UserRole,
  VERIFIER: 'verifier' as UserRole,
  SALESPERSON: 'salesperson' as UserRole,
  SUPPORT: 'support' as UserRole,
  USER: 'user' as UserRole,
};

export function hasRequiredRole(userRole: string, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    superadmin: 7,
    admin: 6,
    project_manager: 5,
    developer: 4,
    verifier: 3,
    salesperson: 2,
    support: 2,
    user: 1,
  };

  return roleHierarchy[userRole as UserRole] >= roleHierarchy[requiredRole];
}

export function getDashboardPath(role: string): string {
  const roleToPath: Record<string, string> = {
    [ROLES.SUPERADMIN]: '/superadmin',
    [ROLES.ADMIN]: '/admin/dashboard',
    [ROLES.PROJECT_MANAGER]: '/organization/project/dashboard',
    [ROLES.DEVELOPER]: '/developer/dashboard',
    [ROLES.VERIFIER]: '/verifier/dashboard',
    [ROLES.SALESPERSON]: '/sales/dashboard',
    [ROLES.SUPPORT]: '/support/dashboard',
  };

  return roleToPath[role] || '/user/dashboard';
}
