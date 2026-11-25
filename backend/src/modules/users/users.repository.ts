import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';
import { UserInput } from './schema/user.schema.js';
import { Prisma, RANK } from '../../generated/prisma/client.js';
import { officeScopeWhere } from '../../common/scope/jurisdiction.js';
import { UUID } from 'crypto';
import { CurrentUserJwtPayload } from '../../types/jwt.payload.js';
import {
  auditChanges,
  auditSnapshot,
  recordAudit,
} from '../audit/audit.writer.js';

// Never returned to clients.
export const LOGIN_INTERNAL_FIELDS = {
  password: true,
  failedLoginCount: true,
  lockedUntil: true,
} as const;

// User fields recorded in the audit log; the password hash never is.
const USER_AUDIT_FIELDS = [
  'account_number',
  'email',
  'rank',
  'first_name',
  'middle_name',
  'last_name',
  'role',
  'section',
  'sectionDesignationRef',
  'officeId',
  'positionId',
] as const;

// The office and region an audit entry is scoped to.
async function officeScope(tx: Prisma.TransactionClient, officeId: string) {
  const office = await tx.office.findUnique({
    where: { id: officeId },
    select: { regionId: true },
  });

  return { officeId, regionId: office?.regionId ?? null };
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async createUser(passwordHash: string, userData: UserInput, actorId: string) {
    return this.prismaService.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          ...userData,
          password: passwordHash,
          mustChangePassword: true,

          notification: {
            create: {},
          },
        },
        omit: LOGIN_INTERNAL_FIELDS,
      });

      await recordAudit(tx, {
        actorId,
        action: 'USER_CREATED',
        entityType: 'USER',
        entityId: user.id,
        ...(await officeScope(tx, user.officeId)),
        changes: auditSnapshot(user, [...USER_AUDIT_FIELDS]),
      });

      return user;
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
            type: true,
            parentId: true,
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

  // Users change only their own password, so the user is also the actor.
  async changePassowrd(passwordHash: string, id: UUID) {
    return this.prismaService.$transaction(async (tx) => {
      const user = await tx.user.update({
        data: {
          password: passwordHash,
          mustChangePassword: false,
        },
        where: {
          id,
        },
      });

      await recordAudit(tx, {
        actorId: id,
        action: 'USER_PASSWORD_CHANGED',
        entityType: 'USER',
        entityId: id,
        ...(await officeScope(tx, user.officeId)),
      });

      return user;
    });
  }

  // Default password, forced change at next login, and every session ended.
  async resetPassword(id: UUID, passwordHash: string, actorId: string) {
    return this.prismaService.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          password: passwordHash,
          mustChangePassword: true,
          failedLoginCount: 0,
          lockedUntil: null,
        },
        select: { officeId: true },
      });

      await tx.refreshToken.deleteMany({ where: { userId: id } });

      await recordAudit(tx, {
        actorId,
        action: 'USER_PASSWORD_RESET',
        entityType: 'USER',
        entityId: id,
        ...(await officeScope(tx, user.officeId)),
      });
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

    // Admins below NHQ see users of the offices in their jurisdiction.
    const offices = officeScopeWhere(user);
    if (Object.keys(offices).length > 0) {
      where.office = offices;
    }

    const [personnel, total] = await Promise.all([
      this.prismaService.user.findMany({
        where,
        include: {
          office: true,
          position: true,
        },
        omit: LOGIN_INTERNAL_FIELDS,
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

  // Returns null when the user doesn't exist. Repeating the current status
  // writes no audit entry.
  async deactivateUser(id: UUID, isActive: boolean, actorId: string) {
    return this.prismaService.$transaction(async (tx) => {
      const before = await tx.user.findUnique({
        where: { id },
        select: { isActive: true },
      });

      if (!before) {
        return null;
      }

      const user = await tx.user.update({
        where: {
          id,
        },
        data: {
          isActive,
        },
      });

      if (before.isActive !== isActive) {
        await recordAudit(tx, {
          actorId,
          action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
          entityType: 'USER',
          entityId: id,
          ...(await officeScope(tx, user.officeId)),
          changes: { isActive: { from: before.isActive, to: isActive } },
        });
      }

      return user;
    });
  }

  // Returns null when the user doesn't exist. An edit that changes nothing
  // writes no audit entry.
  async editUser(userId: UUID, userData: UserInput, actorId: string) {
    return this.prismaService.$transaction(async (tx) => {
      const before = await tx.user.findUnique({ where: { id: userId } });

      if (!before) {
        return null;
      }

      const user = await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          ...userData,
        },
      });

      const changes = auditChanges(before, user, [...USER_AUDIT_FIELDS]);

      if (Object.keys(changes).length > 0) {
        await recordAudit(tx, {
          actorId,
          action: 'USER_UPDATED',
          entityType: 'USER',
          entityId: userId,
          ...(await officeScope(tx, user.officeId)),
          changes,
        });
      }

      return user;
    });
  }
}
