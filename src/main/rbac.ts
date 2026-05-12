import type { UserRole } from '../shared/authTypes.js';
import type { Project } from '../shared/types.js';
import type { SessionContext } from './session.js';

export type Permission =
  | 'app:read'
  | 'project:read'
  | 'project:write'
  | 'task:write'
  | 'prompt:write'
  | 'run:write'
  | 'memory:read'
  | 'memory:write'
  | 'memory:export'
  | 'provider:read'
  | 'provider:write'
  | 'gateway:read'
  | 'gateway:write'
  | 'ops:backup'
  | 'ops:restore'
  | 'git:read'
  | 'skill:read'
  | 'export:write'
  | 'settings:read'
  | 'settings:write'
  | 'dialog:open'
  | 'admin:users'
  | 'admin:audit'
  | 'mcp:write';

const USER_PERMISSIONS: Permission[] = [
  'app:read',
  'project:read',
  'project:write',
  'task:write',
  'prompt:write',
  'run:write',
  'memory:read',
  'memory:write',
  'memory:export',
  'provider:read',
  'gateway:read',
  'git:read',
  'skill:read',
  'export:write',
  'settings:read',
  'settings:write',
  'dialog:open',
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...USER_PERMISSIONS,
  'provider:write',
  'gateway:write',
  'ops:backup',
  'ops:restore',
  'admin:users',
  'admin:audit',
  'mcp:write',
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  user: USER_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
};

export function isValidRole(role: unknown): role is UserRole {
  return role === 'admin' || role === 'user';
}

export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function canRole(role: UserRole, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission);
}

export function assertPermission(role: UserRole, permission: Permission): void {
  if (!canRole(role, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

export type ResourceAction = 'read' | 'write' | 'admin';

const ACL_RANK = {
  viewer: 1,
  editor: 2,
  owner: 3,
  admin: 4,
} as const;

function requiredRank(action: ResourceAction): number {
  if (action === 'read') return ACL_RANK.viewer;
  if (action === 'write') return ACL_RANK.editor;
  return ACL_RANK.owner;
}

export function getProjectResourceRole(context: SessionContext, project: Project | null | undefined) {
  if (context.user.role === 'admin') return 'admin';
  if (!project) return undefined;
  if (project.ownerUserId === context.user.id || project.acl?.ownerUserId === context.user.id) return 'owner';
  const entry = project.acl?.entries?.find((item) => item.userId === context.user.id);
  return entry?.role;
}

export function canAccessProjectResource(
  context: SessionContext,
  project: Project | null | undefined,
  action: ResourceAction,
): boolean {
  if (context.user.role === 'admin') return true;
  const role = getProjectResourceRole(context, project);
  if (!role) return false;
  return ACL_RANK[role] >= requiredRank(action);
}

export function assertProjectAccess(
  context: SessionContext,
  project: Project | null | undefined,
  action: ResourceAction,
): void {
  if (!canAccessProjectResource(context, project, action)) {
    throw new Error(`Resource permission denied: workflow:${action}`);
  }
}
