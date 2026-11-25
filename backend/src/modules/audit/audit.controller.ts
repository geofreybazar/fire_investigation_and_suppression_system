import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { PermissionGuard } from '../../common/guards/permission.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { Permission } from '../../common/authz/permissions.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { type CurrentUserJwtPayload } from '../../types/jwt.payload.js';
import { AuditService } from './audit.service.js';
import {
  listAuditLogsQuerySchema,
  type ListAuditLogsQuery,
} from './schema/audit.schema.js';

@RequirePermission(Permission.AUDIT_VIEW)
@UseGuards(AuthGuard, PermissionGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async findPaginated(
    @Query({ schema: listAuditLogsQuerySchema }) query: ListAuditLogsQuery,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.auditService.findPaginated(query, user);
  }
}
