import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { CurrentUserJwtPayload } from '../../types/jwt.payload.js';
import { AuditRepository } from './audit.repository.js';
import { type ListAuditLogsQuery } from './schema/audit.schema.js';
import { hasPermission, Permission } from '../../common/authz/permissions.js';
import { tierOf } from '../../common/authz/tier.js';

const PAGE_SIZE = 20;

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async findPaginated(query: ListAuditLogsQuery, user: CurrentUserJwtPayload) {
    const where: Prisma.AuditLogWhereInput = {
      AND: [
        await this.scopeWhere(user),
        {
          ...(query.action && { action: query.action }),
          ...(query.entityType && { entityType: query.entityType }),
          ...(query.entityId && { entityId: query.entityId }),
          ...(query.actorId && { actorId: query.actorId }),
          ...((query.from || query.to) && {
            createdAt: {
              ...(query.from && { gte: query.from }),
              ...(query.to && { lte: query.to }),
            },
          }),
        },
      ],
    };

    const skip = (query.page - 1) * PAGE_SIZE;
    const { auditLogs, total } = await this.auditRepository.findPaginated(
      where,
      skip,
      PAGE_SIZE,
    );

    return {
      data: auditLogs,
      pagination: {
        page: query.page,
        limit: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    };
  }

  // REQUIREMENTS.md §7.2: SUPER_ADMIN and NHQ admins read everything; other
  // admins read entries about offices in their jurisdiction, plus their own
  // actions. Entries carry office and region snapshots for this.
  private async scopeWhere(
    user: CurrentUserJwtPayload,
  ): Promise<Prisma.AuditLogWhereInput> {
    if (!hasPermission(user, Permission.AUDIT_VIEW)) {
      throw new ForbiddenException('You are not allowed to view the audit log.');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      return {};
    }

    const own: Prisma.AuditLogWhereInput = { actorId: user.sub };

    switch (tierOf(user.officeType)) {
      case 'NHQ':
        return {};
      case 'REGIONAL':
        return {
          OR: [{ officeId: user.officeId }, { regionId: user.officeId }, own],
        };
      case 'DISTRICT_PROVINCE': {
        const stations = await this.auditRepository.findChildOfficeIds(
          user.officeId,
        );
        return {
          OR: [{ officeId: { in: [user.officeId, ...stations] } }, own],
        };
      }
      case 'STATION':
        return { OR: [{ officeId: user.officeId }, own] };
    }
  }
}
