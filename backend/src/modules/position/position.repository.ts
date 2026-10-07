import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';
import { PositionInput } from './schema/position.schema.js';
import { UUID } from 'crypto';

@Injectable()
export class PositionRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async createPosition(positionData: PositionInput) {
    return this.prismaService.position.create({
      data: {
        name: positionData.name,
      },
    });
  }

  async findPaginatedPositions(skip: number, limit: number, search?: string) {
    const where = {
      ...(search && {
        name: {
          contains: search,
          mode: 'insensitive' as const,
        },
      }),

      isActive: true,
    };

    const [positions, total] = await Promise.all([
      this.prismaService.position.findMany({
        where,
        include: {
          users: true,
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

    return {
      positions,
      total,
    };
  }

  async updatePosition(id: UUID, positionData: PositionInput) {
    return this.prismaService.position.update({
      data: {
        name: positionData.name,
      },
      where: {
        id,
      },
    });
  }

  async findPositionForDeletion(id: UUID) {
    return this.prismaService.position.findUnique({
      where: {
        id,
      },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });
  }

  async deletePosition(id: UUID) {
    return this.prismaService.position.delete({ where: { id } });
  }

  async findAllPositions() {
    return this.prismaService.position.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    });
  }
}
