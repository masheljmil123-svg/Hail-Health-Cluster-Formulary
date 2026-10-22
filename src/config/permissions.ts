import type { Permission, RoleId } from '@/types';

/**
 * Central privilege map.
 * Client checks only shape the prototype. A secure backend must enforce
 * authorization before any production deployment.
 */
export const rolePermissions: Record<RoleId, readonly Permission[]> = {
  visitor: ['content:read'],
  reviewer: ['content:read', 'content:review'],
  administrator: [
    'content:read',
    'content:create',
    'content:update',
    'content:archive',
    'content:restore',
    'content:delete',
    'content:review',
    'sections:manage',
    'media:manage',
    'users:view',
    'activity:view',
    'settings:manage',
  ],
};

export const roleSummaries: Record<RoleId, { label: string; summary: string; active: boolean }> = {
  visitor: {
    label: 'Public Visitor',
    summary: 'Can browse and search published demonstration content.',
    active: true,
  },
  administrator: {
    label: 'Administrator',
    summary: 'Can create, edit, publish, archive, delete, and organize demonstration content.',
    active: true,
  },
  reviewer: {
    label: 'Reviewer',
    summary: 'Reserved for a future clinical approval workflow. Not available in this prototype.',
    active: false,
  },
};

export const permissionLabels: Record<Permission, string> = {
  'content:read': 'Browse published content',
  'content:create': 'Create content',
  'content:update': 'Edit and publish content',
  'content:archive': 'Archive content',
  'content:restore': 'Restore archived content',
  'content:delete': 'Delete content',
  'content:review': 'Clinical review (reserved)',
  'sections:manage': 'Edit homepage sections',
  'media:manage': 'Manage media notes',
  'users:view': 'View the privilege map',
  'activity:view': 'View the activity log',
  'settings:manage': 'Manage prototype settings',
};

export function can(role: RoleId | null | undefined, permission: Permission): boolean {
  const resolved: RoleId = role ?? 'visitor';
  return rolePermissions[resolved].includes(permission);
}
