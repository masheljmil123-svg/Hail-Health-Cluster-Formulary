import type { RoleId } from '@/types';

/** Prototype navigation home after sign-in (not a security boundary). */
export function homePathForRole(role: RoleId | string | undefined): string {
  if (role === 'administrator') return '/admin';
  if (role === 'team_member') return '/workspace';
  if (role === 'staff') return '/';
  return '/';
}
