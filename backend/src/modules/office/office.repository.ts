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

@Injectable()
export class OfficeRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(id: string) {
    return this.prismaService.office.findUnique({
      where: { id },
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

  async deleteById(id: string) {
    return this.prismaService.office.delete({
      where: { id },
    });
  }

  async createOffice(data: OfficeInput) {
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

      if (data.type === OfficeType.REGIONAL_OFFICE) {
        // Regional Office belongs to no region
        regionId = null;
      } else if (parentOffice.type === OfficeType.REGIONAL_OFFICE) {
        // Child of Regional Office
        regionId = parentOffice.id;
      } else {
        // Child of District/Provincial/etc.
        regionId = parentOffice.regionId;
      }
    }

    // 3. Create the office
    return this.prismaService.office.create({
      data: {
        name: data.name,
        type: data.type,
        parentId: data.parentId,
        regionId,
      },
    });
  }

  async updateOffice(officeId: UUID, data: OfficeInput) {
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

      if (data.type === OfficeType.REGIONAL_OFFICE) {
        // Regional Office belongs to no region
        regionId = null;
      } else if (parentOffice.type === OfficeType.REGIONAL_OFFICE) {
        // Child of Regional Office
        regionId = parentOffice.id;
      } else {
        // Child of District/Provincial/etc.
        regionId = parentOffice.regionId;
      }
    }

    if (data.parentId === officeId) {
      throw new BadRequestException('An office cannot be its own parent');
    }

    // update the office
    return this.prismaService.office.update({
      data: {
        name: data.name,
        type: data.type,
        parentId: data.parentId,
        regionId,
      },
      where: {
        id: officeId,
      },
    });
  }
}
