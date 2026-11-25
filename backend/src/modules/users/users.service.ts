import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { UsersRepository } from './users.repository.js';
import { UsersAuthorizationService } from './service/users.authorization.service.js';
import { OfficeRepository } from '../office/office.repository.js';

import {
  ChangePasswordInput,
  ChangeUserStatusInput,
  UserInput,
} from './schema/user.schema.js';

import bcrypt from 'bcrypt';
import { UUID } from 'crypto';

import { RANK, UserRole } from '../../generated/prisma/enums.js';
import { CurrentUserJwtPayload } from '../../types/jwt.payload.js';
import { hasPermission, Permission } from '../../common/authz/permissions.js';
import { canManageAccount } from '../../common/authz/user-assignment.js';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private usersRepository: UsersRepository,
    private officeRepository: OfficeRepository,
    private configService: ConfigService,
    private usersAuthorizationService: UsersAuthorizationService,
  ) {}

  private async defaultPasswordHash() {
    const defaultPassword = this.configService.get<string>(
      'defaultPassword',
    ) as string;
    return bcrypt.hash(defaultPassword, SALT_ROUNDS);
  }

  private async findTargetOffice(officeId: string) {
    const office = await this.officeRepository.findById(officeId);

    if (!office) {
      throw new NotFoundException('Selected office not found');
    }

    return office;
  }

  async createUser(userData: UserInput, user: CurrentUserJwtPayload) {
    const office = await this.findTargetOffice(userData.officeId);

    this.usersAuthorizationService.assertCanAssign(
      user,
      userData.role,
      office,
      userData.section,
    );

    const newUser = await this.usersRepository.createUser(
      await this.defaultPasswordHash(),
      userData,
      user.sub,
    );

    this.logger.log(`User created: ${newUser.id}`);

    return newUser;
  }

  // Users may read their own profile; admins may read accounts they manage.
  async getUser(userId: UUID, currentUser: CurrentUserJwtPayload) {
    const isSelf = userId === currentUser.sub;

    // Reject before the lookup so non-admins can't probe which ids exist.
    if (!isSelf && !hasPermission(currentUser, Permission.USER_MANAGE)) {
      throw new ForbiddenException('You are not allowed to view this user.');
    }

    const user = await this.usersRepository.findUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!isSelf && !canManageAccount(currentUser, user)) {
      throw new ForbiddenException('You are not allowed to view this user.');
    }

    const { password, failedLoginCount, lockedUntil, ...safeUser } = user;
    return safeUser;
  }

  async changePassword(passwordData: ChangePasswordInput, userId: UUID) {
    const { currentPassword, newPassword } = passwordData;

    const user = await this.usersRepository.findUserForChangePassword(userId);

    const passwordCorrect =
      user === null
        ? false
        : await bcrypt.compare(currentPassword, user.password);

    if (!user || !passwordCorrect) {
      this.logger.warn(`Password change failed for account: ${userId}`);
    }

    if (!user) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Not 401: the frontend treats Unauthorized as a dead session and logs out.
    if (!passwordCorrect) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (await bcrypt.compare(newPassword, user.password)) {
      throw new BadRequestException(
        'The new password must be different from the current one.',
      );
    }

    await this.usersRepository.changePassowrd(
      await bcrypt.hash(newPassword, SALT_ROUNDS),
      userId,
    );
  }

  // Sets the default password and makes the user change it at next login
  // (FR-USR-007). Signs the user out everywhere.
  async resetPassword(userId: UUID, currentUser: CurrentUserJwtPayload) {
    if (userId === currentUser.sub) {
      throw new ForbiddenException(
        'Change your own password from your profile instead.',
      );
    }

    await this.usersAuthorizationService.assertCanManageUser(
      userId,
      currentUser,
    );

    await this.usersRepository.resetPassword(
      userId,
      await this.defaultPasswordHash(),
      currentUser.sub,
    );

    return {
      message:
        'Password reset. The user must change the default password at next login.',
    };
  }

  async findPaginatedUsers(
    currentUser: CurrentUserJwtPayload,
    page: number,
    search: string,
    officeId: UUID,
    status: 'Active' | 'Inactive',
    rank?: RANK,
  ) {
    if (!hasPermission(currentUser, Permission.USER_MANAGE)) {
      throw new ForbiddenException('You are not allowed to list users.');
    }

    const limit = 10;
    const skip = (page - 1) * limit;

    const { personnel, total } = await this.usersRepository.findPaginatedUsers(
      currentUser,
      search,
      officeId,
      limit,
      skip,
      status,
      rank,
    );

    return {
      data: personnel,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async changeUserStatus(
    userId: UUID,
    isActive: ChangeUserStatusInput,
    currentUser: CurrentUserJwtPayload,
  ) {
    if (!isActive.isActive && userId === currentUser.sub) {
      throw new ForbiddenException('You cannot deactivate your own account.');
    }

    await this.usersAuthorizationService.assertCanManageUser(
      userId,
      currentUser,
    );

    const user = await this.usersRepository.deactivateUser(
      userId,
      isActive.isActive,
      currentUser.sub,
    );

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return {
      message: isActive.isActive
        ? 'User activated successfully.'
        : 'User deactivated successfully.',
    };
  }

  async editUser(
    userId: UUID,
    userData: UserInput,
    user: CurrentUserJwtPayload,
  ) {
    const target = await this.usersAuthorizationService.assertCanManageUser(
      userId,
      user,
    );

    // The SUPER_ADMIN account keeps its role, office and (no) section.
    if (target.role === UserRole.SUPER_ADMIN) {
      if (
        userData.role !== UserRole.SUPER_ADMIN ||
        userData.officeId !== target.office.id ||
        userData.section !== null
      ) {
        throw new ForbiddenException(
          'The SUPER_ADMIN role, office and section cannot be changed through the API.',
        );
      }
    } else {
      const office = await this.findTargetOffice(userData.officeId);
      this.usersAuthorizationService.assertCanAssign(
        user,
        userData.role,
        office,
        userData.section,
      );
    }

    const editedUser = await this.usersRepository.editUser(
      userId,
      userData,
      user.sub,
    );

    if (!editedUser) {
      throw new NotFoundException('User not found.');
    }

    this.logger.log(`User edited: ${editedUser.id}`);

    return { message: 'user successfully updated' };
  }
}
