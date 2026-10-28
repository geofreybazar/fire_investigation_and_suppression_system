import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';
import { UserInput } from './schema/user.schema.js';
import { Prisma, RANK, ROLE } from '../../generated/prisma/client.js';
import { UUID } from 'crypto';
import { CurrentUserJwtPayload } from '../../types/jwt.payload.js';

@Injectable()
export class UsersRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async createUser(passwordHash: string, userData: UserInput) {
    return this.prismaService.user.create({
      data: {
        ...userData,
        password: passwordHash,

        notification: {
          create: {},
        },
      },
      omit: {
        password: true,
      },
    });
  }

  async findUserById(userId: UUID) {
    return this.prismaService.user.findUnique({
      where: {
        id: userId,
        isActive: true,
      },
      include: {
        office: true,
        position: true,
      },
    });
  }

  async countActiveUsersWithRole(officeId: string, role: ROLE) {
    return this.prismaService.user.count({
      where: { officeId, role, isActive: true },
    });
  }

  // Investigations assigned to the user that are not yet approved.
  async countOpenAssignedInvestigations(userId: UUID) {
    return this.prismaService.investigation.count({
      where: { assignedInvestigatorId: userId, completedAt: null },
    });
  }

  // No isActive filter: inactive users must still be found to be reactivated.
  async findUserRoleById(userId: UUID) {
    return this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        role: true,
        office: {
          select: {
            id: true,
            regionId: true,
          },
        },
      },
    });
  }

  async findUserForChangePassword(userId: UUID) {
    return this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
    });
  }

  async changePassowrd(passwordHash: string, id: UUID) {
    return this.prismaService.user.update({
      data: {
        password: passwordHash,
      },
      where: {
        id,
      },
    });
  }

  async findPaginatedUsers(
    user: CurrentUserJwtPayload,
    search: string,
    officeId: UUID,
    limit: number,
    skip: number,
    status: 'Active' | 'Inactive',
    rank?: RANK,
  ) {
    const where: Prisma.UserWhereInput = {
      ...(search && {
        OR: [
          {
            first_name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            last_name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      }),

      ...(officeId && {
        officeId,
      }),

      ...(rank && {
        rank: rank,
      }),

      isActive: status === 'Active' ? true : false,
    };

    // REGIONAL_ADMIN only sees users in their own office and its region.
    if (user.role === 'REGIONAL_ADMIN') {
      where.office = {
        OR: [{ id: user.officeId }, { regionId: user.officeId }],
      };
    }

    const [personnel, total] = await Promise.all([
      this.prismaService.user.findMany({
        where,
        include: {
          office: true,
          position: true,
        },
        omit: {
          password: true,
        },
        skip,
        take: limit,
        orderBy: {
          last_name: 'asc',
        },
      }),

      this.prismaService.user.count({
        where,
      }),
    ]);

    return {
      personnel,
      total,
    };
  }

  async deactivateUser(id: UUID, isActive: boolean) {
    return this.prismaService.user.update({
      where: {
        id,
      },
      data: {
        isActive,
      },
    });
  }

  async editUser(userId: UUID, userData: UserInput) {
    return this.prismaService.user.update({
      where: {
        id: userId,
      },
      data: {
        ...userData,
      },
    });
  }
}
