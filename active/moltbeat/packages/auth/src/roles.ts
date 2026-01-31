import { UserRole } from '@moltbeat/database';

/**
 * Role hierarchy (higher number = more permissions)
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  READONLY: 1,
  USER: 2,
  ADMIN: 3,
};

/**
 * Check if a role has required permission level
 * @param userRole - User's role
 * @param requiredRole - Required role
 * @returns True if user has sufficient permissions
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if user is admin
 */
export function isAdmin(role: UserRole): boolean {
  return role === 'ADMIN';
}

/**
 * Check if user has write permissions
 */
export function canWrite(role: UserRole): boolean {
  return hasRole(role, 'USER');
}

/**
 * Check if user has read-only access
 */
export function canRead(role: UserRole): boolean {
  return hasRole(role, 'READONLY');
}

/**
 * Permission names for API key permissions
 */
export type Permission = 'read' | 'write' | 'admin';

/**
 * Check if permissions include required permission
 */
export function hasPermission(permissions: Permission[], required: Permission): boolean {
  if (permissions.includes('admin')) {
    return true; // Admin has all permissions
  }

  if (required === 'write') {
    return permissions.includes('write') || permissions.includes('admin');
  }

  if (required === 'read') {
    return permissions.includes('read') || permissions.includes('write') || permissions.includes('admin');
  }

  return permissions.includes(required);
}
