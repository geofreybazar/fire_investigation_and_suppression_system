import { SetMetadata } from '@nestjs/common';
import { Permission } from '../authz/permissions.js';

export const PERMISSIONS_KEY = 'permissions';

// The user needs at least one of the listed permissions (checked by
// PermissionGuard). Scope is still checked in the service.
export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
