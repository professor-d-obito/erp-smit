import { prisma } from './db';

export const PERMISSION_CODES = {
  STAFF_VIEW: 'staff:view',
  STAFF_CREATE: 'staff:create',
  STAFF_EDIT: 'staff:edit',
  STAFF_DEACTIVATE: 'staff:deactivate',
  STAFF_RESET_PASSWORD: 'staff:reset_password',
  STAFF_EXPORT: 'staff:export',
  STAFF_VIEW_SELF: 'staff:view_self',
  
  ACADEMIC_VIEW: 'academic:view',
  ACADEMIC_MANAGE: 'academic:manage',

  STUDENTS_VIEW: 'students:view',
  STUDENTS_MANAGE: 'students:manage',

  ATTENDANCE_MANAGE: 'attendance:manage',

  DOCUMENTS_UPLOAD: 'documents:upload',
  DOCUMENTS_VIEW: 'documents:view',
  DOCUMENTS_MANAGE: 'documents:manage',

  REPORTS_VIEW: 'reports:view',
  AUDIT_VIEW: 'audit:view',
  SETTINGS_MANAGE: 'settings:manage',
  ROLES_MANAGE: 'roles:manage',
  ANNOUNCEMENTS_VIEW: 'announcements:view',
  ANNOUNCEMENTS_MANAGE: 'announcements:manage',

  OBE_VIEW: 'obe:view',
  OBE_MANAGE: 'obe:manage',
} as const;

export type PermissionCode = keyof typeof PERMISSION_CODES | string;

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  employeeId: string;
  roleId: string;
  roleName: string;
  roleLabel: string;
  departmentId?: string | null;
  mustChangePassword?: boolean;
  permissions: string[]; // List of permission codes
}

/**
 * Check if user object has the requested permission
 */
export function hasPermission(user: AuthenticatedUser | null, permissionCode: string): boolean {
  if (!user) return false;
  
  // Super Admin always has full access to everything
  if (user.roleName === 'SUPER_ADMIN') return true;

  return user.permissions.includes(permissionCode);
}

/**
 * Check user role helpers
 */
export function isSuperAdmin(user: AuthenticatedUser | null): boolean {
  return user?.roleName === 'SUPER_ADMIN';
}

export function isHOD(user: AuthenticatedUser | null): boolean {
  return user?.roleName === 'HOD';
}

export function isStaff(user: AuthenticatedUser | null): boolean {
  return user?.roleName === 'STAFF';
}

/**
 * Enforce Department Isolation:
 * - Super Admin can query any department or view all (returns null or requested filter)
 * - HOD and Staff are strictly restricted to their assigned user.departmentId
 */
export function getEffectiveDepartmentId(user: AuthenticatedUser | null, requestedDeptId?: string | null): string | null {
  if (!user) return null;
  
  // Super Admin can select any department or view all (null)
  if (isSuperAdmin(user)) {
    return requestedDeptId || null;
  }

  // HOD and Staff MUST only see their own department
  return user.departmentId || null;
}

/**
 * Verify if user is allowed to access a specific department's resource
 */
export function canAccessDepartment(user: AuthenticatedUser | null, departmentId: string | null | undefined): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (!departmentId || !user.departmentId) return false;
  return user.departmentId === departmentId;
}

/**
 * Fetch permissions for a specific role ID from database
 */
export async function getRolePermissions(roleId: string): Promise<string[]> {
  const rolePermissions = await prisma.rolePermission.findMany({
    where: { roleId },
    include: { permission: true },
  });

  return rolePermissions.map((rp) => rp.permission.code);
}
