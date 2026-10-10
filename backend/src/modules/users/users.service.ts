import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { UsersRepository } from './users.repository.js';
import { OfficeRepository } from '../office/office.repository.js';

import {
  ChangePasswordInput,
  ChangeUserStatusInput,
  UserInput,
} from './schema/user.schema.js';

import bcrypt from 'bcrypt';
import { UUID } from 'crypto';

import { RANK, ROLE } from '../../generated/prisma/enums.js';
import { rolePermissions } from './utils/users.permissions.js';
import { role_officePermissions } from './utils/users.role_office.permissions.js';
import { OfficeAuthorizationService } from '../office/services/office.authorization.service.js';
import { CurrentUserJwtPayload } from '../../types/jwt.payload.js';

const USER_SCOPE_MESSAGE = 'You can only manage users within your own region';

const ADMIN_ROLES: ROLE[] = [
  ROLE.SUPER_ADMIN,
  ROLE.NHQ_ADMIN,
  ROLE.REGIONAL_ADMIN,
];

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private usersRepository: UsersRepository,
    private officeRepository: OfficeRepository,
    private configService: ConfigService,
    private officeAuthorizationService: OfficeAuthorizationService,
  ) {}

  async createUser(userData: UserInput, user: CurrentUserJwtPayload) {
    this.logger.log(`Creating user: ${userData.email}`);

    // check allowed role creation by user role
    const allowedRoles = rolePermissions[user.role];

    if (!allowedRoles?.includes(userData.role)) {
      throw new ForbiddenException(
        `${user.role} is not allowed to create a user with role ${userData.role}`,
      );
    }

    // check allow role to office permission
    const allowedOfficeTypes = role_officePermissions[userData.role];

    const office = await this.officeRepository.findById(userData.officeId);

    if (!office) {
      throw new NotFoundException('Selected office not found');
    }

    if (!allowedOfficeTypes.includes(office.type)) {
      throw new ForbiddenException(
        `Role ${userData.role} cannot be assigned to ${office.type}`,
      );
    }

    this.officeAuthorizationService.assertOfficeInScope(
      user,
      office,
      USER_SCOPE_MESSAGE,
    );

    const defaultPassword = this.configService.get<string>(
      'defaultPassword',
    ) as string;

    const saltRound = 10;

    const passwordHash = await bcrypt.hash(defaultPassword, saltRound);

    // create new user
    const newUser = await this.usersRepository.createUser(
      passwordHash,
      userData,
    );

    this.logger.log(`User created: ${newUser.id}`);

    return newUser;
  }

  // Users may read their own profile; admins may read users in their scope.
  async getUser(userId: UUID, currentUser: CurrentUserJwtPayload) {
    const isSelf = userId === currentUser.sub;
    const isNationalAdmin =
      currentUser.role === ROLE.SUPER_ADMIN ||
      currentUser.role === ROLE.NHQ_ADMIN;

    // Reject before the lookup so non-admins can't probe which ids exist.
    if (
      !isSelf &&
      !isNationalAdmin &&
      currentUser.role !== ROLE.REGIONAL_ADMIN
    ) {
      throw new ForbiddenException('You are not allowed to view this user.');
    }

    const user = await this.usersRepository.findUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isInRegion =
      user.officeId === currentUser.officeId ||
      user.office.regionId === currentUser.officeId;

    if (!isSelf && !isNationalAdmin && !isInRegion) {
      throw new ForbiddenException('You are not allowed to view this user.');
    }

    const { password, ...safeUser } = user;
    return safeUser;
  }

  async changePassword(passwordData: ChangePasswordInput, userId: UUID) {
    const { currentPassword, newPassword } = passwordData;

    // find user
    const user = await this.usersRepository.findUserForChangePassword(userId);

    // check if user entered valid old pasword
    const passwordCorrect =
      user === null
        ? false
        : await bcrypt.compare(currentPassword, user.password);

    if (!user || !passwordCorrect) {
      this.logger.warn(`Password change failed for account: ${userId}`);
      throw new UnauthorizedException('Current password is incorrect');
    }

    const saltRound = 10;

    const passwordHash = await bcrypt.hash(newPassword, saltRound);

    // store new password
    const returnedUser = await this.usersRepository.changePassowrd(
      passwordHash,
      userId,
    );

    return;
  }

  async findPaginatedUsers(
    currentUser: CurrentUserJwtPayload,
    page: number,
    search: string,
    officeId: UUID,
    status: 'Active' | 'Inactive',
    rank?: RANK,
  ) {
    if (!ADMIN_ROLES.includes(currentUser.role)) {
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

    await this.assertCanManageUser(userId, currentUser);

    const user = await this.usersRepository.deactivateUser(
      userId,
      isActive.isActive,
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
    this.logger.log(`Creating user: ${userData.email}`);

    const targetRole = await this.assertCanManageUser(userId, user);

    // The SUPER_ADMIN account keeps its role: the API can neither grant nor remove it.
    if (targetRole === ROLE.SUPER_ADMIN || userData.role === ROLE.SUPER_ADMIN) {
      if (targetRole !== userData.role) {
        throw new ForbiddenException(
          'The SUPER_ADMIN role cannot be granted or removed through the API',
        );
      }
    } else {
      // check allowed role creation by user role
      const allowedRoles = rolePermissions[user.role];

      if (!allowedRoles?.includes(userData.role)) {
        throw new ForbiddenException(
          `${user.role} is not allowed to assign a user with role ${userData.role}`,
        );
      }
    }

    // check allow role to office permission
    const allowedOfficeTypes = role_officePermissions[userData.role];

    const office = await this.officeRepository.findById(userData.officeId);

    if (!office) {
      throw new NotFoundException('Selected office not found');
    }

    if (!allowedOfficeTypes.includes(office.type)) {
      throw new ForbiddenException(
        `Role ${userData.role} cannot be assigned to ${office.type}`,
      );
    }

    this.officeAuthorizationService.assertOfficeInScope(
      user,
      office,
      USER_SCOPE_MESSAGE,
    );

    // edit user info
    const editedUser = await this.usersRepository.editUser(userId, userData);

    if (!editedUser) {
      throw new NotFoundException('for editing user cannot found');
    }

    this.logger.log(`User edited: ${editedUser.id}`);

    return {
      message: 'user successfully updated',
    };
  }

  // An admin may only manage users whose current role they could grant;
  // SUPER_ADMIN may additionally manage the SUPER_ADMIN account.
  private async assertCanManageUser(
    userId: UUID,
    currentUser: CurrentUserJwtPayload,
  ) {
    const target = await this.usersRepository.findUserRoleById(userId);

    if (!target) {
      throw new NotFoundException('User not found.');
    }

    const canManage =
      rolePermissions[currentUser.role]?.includes(target.role) ||
      (currentUser.role === ROLE.SUPER_ADMIN &&
        target.role === ROLE.SUPER_ADMIN);

    if (!canManage) {
      throw new ForbiddenException(
        `${currentUser.role} is not allowed to manage a user with role ${target.role}`,
      );
    }

    this.officeAuthorizationService.assertOfficeInScope(
      currentUser,
      target.office,
      USER_SCOPE_MESSAGE,
    );

    return target.role;
  }
}
