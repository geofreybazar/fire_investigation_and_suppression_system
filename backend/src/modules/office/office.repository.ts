import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';
import { OfficeInput } from './schema/office.schema.js';
import { OfficeType, Prisma } from '../../generated/prisma/client.js';
import { UUID } from 'crypto';
import { CurrentUserJwtPayload } from '../../types/jwt.payload.js';
import { normalizeRegionCode } from './utils/validateRegionCode.js';
import {
  auditChanges,
  auditSnapshot,
  recordAudit,
} from '../audit/audit.writer.js';

const OFFICE_AUDIT_FIELDS = [
  'name',
  'type',
  'parentId',
  'regionId',
  'regionCode',
] as const;

interface RegionParent {
  id: string;
  type: OfficeType;
  regionId: string | null;
}

// The regional office an office belongs to, given its parent. Regional
// offices themselves belong to no region.
function regionIdUnder(type: OfficeType, parent: RegionParent): string | null {
  if (type === OfficeType.REGIONAL_OFFICE) {
    return null;
  }

  return parent.type === OfficeType.REGIONAL_OFFICE
    ? parent.id
    : parent.regionId;
}

@Injectable()
export class OfficeRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(id: string) {
    return this.prismaService.office.findUnique({
      where: { id },
    });
  }

  // Another office with the same name (any case) under the same parent.
  async findByNameUnderParent(
    name: string,
    parentId: string | null,
    excludeId?: string,
  ) {
    return this.prismaService.office.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        parentId,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    });
  }

  async findByIdForDeletion(id: string) {
    return this.prismaService.office.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            children: true,
            fireIncidents: true,
            handledIncidentInvestigations: true,
            conductedInvestigations: true,
            referralsFrom: true,
            referralsTo: true,
          },
        },
      },
    });
  }

  async findAllOffices(user: CurrentUserJwtPayload) {
    const where: Prisma.OfficeWhereInput = {
      isActive: true,
    };

    if (user.role === 'REGIONAL_ADMIN') {
      where.OR = [{ id: user.officeId }, { regionId: user.officeId }];
    }

    return this.prismaService.office.findMany({
      where,
      include: {
        parent: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findPaginatedOffices(
    user: CurrentUserJwtPayload,
    skip: number,
    limit: number,
    search: string,
    officetype: OfficeType,
  ) {
    const where: Prisma.OfficeWhereInput = {
      ...(search && {
        name: {
          contains: search,
          mode: 'insensitive' as const,
        },
      }),

      ...(officetype && {
        type: officetype,
      }),

      isActive: true,
    };

    if (user.role === 'REGIONAL_ADMIN') {
      where.OR = [{ id: user.officeId }, { regionId: user.officeId }];
    }

    const [offices, total] = await Promise.all([
      this.prismaService.office.findMany({
        where,
        include: {
          parent: true,
        },
        skip,
        take: limit,
        orderBy: {
          name: 'asc',
        },
      }),

      this.prismaService.office.count({
        where,
      }),
    ]);

    return { offices, total };
  }

  // A counter row exists once any incident number has used the code.
  async isRegionCodeUsed(regionCode: string) {
    const count = await this.prismaService.incidentNumberCounter.count({
      where: { regionCode },
    });

    return count > 0;
  }

  async deleteById(id: string, actorId: string) {
    return this.prismaService.$transaction(async (tx) => {
      const office = await tx.office.delete({
        where: { id },
      });

      await recordAudit(tx, {
        actorId,
        action: 'OFFICE_DELETED',
        entityType: 'OFFICE',
        entityId: id,
        officeId: id,
        regionId: office.regionId,
        changes: auditSnapshot(office, [...OFFICE_AUDIT_FIELDS]),
      });

      return office;
    });
  }

  async createOffice(data: OfficeInput, actorId: string) {
    let regionId: string | null = null;

    // 1. If this office has a parent, get the parent
    if (data.parentId) {
      const parentOffice = await this.prismaService.office.findUnique({
        where: {
          id: data.parentId,
        },
        select: {
          id: true,
          type: true,
          regionId: true,
        },
      });

      if (!parentOffice) {
        throw new NotFoundException('Parent office not found');
      }

      regionId = regionIdUnder(data.type, parentOffice);
    }

    // 3. Create the office
    return this.prismaService.$transaction(async (tx) => {
      const office = await tx.office.create({
        data: {
          name: data.name,
          type: data.type,
          parentId: data.parentId,
          regionId,
          regionCode: normalizeRegionCode(data.regionCode),
        },
      });

      await recordAudit(tx, {
        actorId,
        action: 'OFFICE_CREATED',
        entityType: 'OFFICE',
        entityId: office.id,
        officeId: office.id,
        regionId: office.regionId,
        changes: auditSnapshot(office, [...OFFICE_AUDIT_FIELDS]),
      });

      return office;
    });
  }

  async updateOffice(officeId: UUID, data: OfficeInput, actorId: string) {
    let regionId: string | null = null;

    // 1. If this office has a parent, get the parent
    if (data.parentId) {
      const parentOffice = await this.prismaService.office.findUnique({
        where: {
          id: data.parentId,
        },
        select: {
          id: true,
          type: true,
          regionId: true,
        },
      });

      if (!parentOffice) {
        throw new NotFoundException('Parent office not found');
      }

      regionId = regionIdUnder(data.type, parentOffice);
    }

    if (data.parentId === officeId) {
      throw new BadRequestException('An office cannot be its own parent');
    }

    // The office and every office below it are re-regioned together.
    return this.prismaService.$transaction(async (tx) => {
      const before = await tx.office.findUnique({ where: { id: officeId } });

      const updated = await tx.office.update({
        data: {
          name: data.name,
          type: data.type,
          parentId: data.parentId,
          regionId,
          regionCode: normalizeRegionCode(data.regionCode),
        },
        where: {
          id: officeId,
        },
      });

      await this.recomputeDescendantRegions(tx, updated);

      const changes = before
        ? auditChanges(before, updated, [...OFFICE_AUDIT_FIELDS])
        : {};

      if (Object.keys(changes).length > 0) {
        await recordAudit(tx, {
          actorId,
          action: 'OFFICE_UPDATED',
          entityType: 'OFFICE',
          entityId: officeId,
          officeId,
          regionId: updated.regionId,
          changes,
        });
      }

      return updated;
    });
  }

  // Walks the hierarchy one level at a time, so each child's region is derived
  // from its already-updated parent.
  private async recomputeDescendantRegions(
    tx: Prisma.TransactionClient,
    root: RegionParent,
  ) {
    let level: RegionParent[] = [root];

    while (level.length > 0) {
      const parents = new Map(level.map((office) => [office.id, office]));

      const children = await tx.office.findMany({
        where: { parentId: { in: [...parents.keys()] } },
        select: { id: true, type: true, parentId: true },
      });

      const idsByRegion = new Map<string | null, string[]>();
      const next: RegionParent[] = [];

      for (const child of children) {
        const regionId = regionIdUnder(
          child.type,
          parents.get(child.parentId!)!,
        );

        idsByRegion.set(regionId, [
          ...(idsByRegion.get(regionId) ?? []),
          child.id,
        ]);
        next.push({ id: child.id, type: child.type, regionId });
      }

      for (const [regionId, ids] of idsByRegion) {
        await tx.office.updateMany({
          where: { id: { in: ids } },
          data: { regionId },
        });
      }

      level = next;
    }
  }
}
