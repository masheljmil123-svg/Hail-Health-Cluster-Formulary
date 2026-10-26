import type { Permission, RoleId } from '@/types';

/**
 * Central privilege map.
 * Client checks shape the UI. Server/database RLS must enforce authorization
 * before any hospital production deployment.
 */
export const rolePermissions: Record<RoleId, readonly Permission[]> = {
  visitor: ['content:read'],
  staff: ['content:read'],
  team_member: [
    'content:read',
    'content:create',
    'content:update',
    'content:submit',
  ],
  reviewer: ['content:read', 'content:review'],
  administrator: [
    'content:read',
    'content:create',
    'content:update',
    'content:archive',
    'content:restore',
    'content:delete',
    'content:review',
    'content:publish',
    'content:submit',
    'sections:manage',
    'media:manage',
    'users:view',
    'users:manage',
    'activity:view',
    'settings:manage',
  ],
};

export const roleSummaries: Record<RoleId, { label: string; summary: string; active: boolean }> = {
  visitor: {
    label: 'Public Visitor',
    summary: 'Can search and view published medications and approved public resources.',
    active: true,
  },
  staff: {
    label: 'General Staff',
    summary: 'Read-only access to hospital selection and published formulary content. Cannot edit or publish.',
    active: true,
  },
  team_member: {
    label: 'Team Member / Content Editor',
    summary: 'Can create drafts, upload resources, submit for review, and revise own work. Cannot approve or publish.',
    active: true,
  },
  administrator: {
    label: 'Administrator / Supervisor',
    summary: 'Full content management: review, approve, publish, unpublish, manage users, and view audit history.',
    active: true,
  },
  reviewer: {
    label: 'Reviewer (legacy)',
    summary: 'Reserved label; clinical approval is performed by the Administrator in the initial version.',
    active: false,
  },
};

export const permissionLabels: Record<Permission, string> = {
  'content:read': 'Browse published content',
  'content:create': 'Create draft content',
  'content:update': 'Edit assigned drafts',
  'content:archive': 'Archive content',
  'content:restore': 'Restore archived content',
  'content:delete': 'Delete content',
  'content:review': 'Review and approve submissions',
  'content:publish': 'Publish or unpublish content',
  'content:submit': 'Submit content for review',
  'sections:manage': 'Edit homepage sections',
  'media:manage': 'Manage media library',
  'users:view': 'View team accounts',
  'users:manage': 'Invite and manage team accounts',
  'activity:view': 'View activity & analytics',
  'settings:manage': 'Manage system settings',
};

export function can(role: RoleId | null | undefined, permission: Permission): boolean {
  const resolved: RoleId = role ?? 'visitor';
  return rolePermissions[resolved].includes(permission);
}
