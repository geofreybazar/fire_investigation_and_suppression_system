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

import { RANK } from '../../generated/prisma/enums.js';
import { rolePermissions } from './utils/users.permissions.js';
import { role_officePermissions } from './utils/users.role_office.permissions.js';
import { CurrentUserJwtPayload } from '../../types/jwt.payload.js';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private usersRepository: UsersRepository,
    private officeRepository: OfficeRepository,
    private configService: ConfigService,
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

  async getUser(userId: UUID) {
    const user = await this.usersRepository.findUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
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
    page: number,
    search: string,
    officeId: UUID,
    status: 'Active' | 'Inactive',
    rank?: RANK,
  ) {
    const limit = 10;
    const skip = (page - 1) * limit;

    const { personnel, total } = await this.usersRepository.findPaginatedUsers(
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

  async changeUserStatus(userId: UUID, isActive: ChangeUserStatusInput) {
    const user = await this.usersRepository.deactivateUser(
      userId,
      isActive.isActive,
    );

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return {
      message: 'User deactivated successfully.',
    };
  }

  async editUser(
    userId: UUID,
    userData: UserInput,
    user: CurrentUserJwtPayload,
  ) {
    this.logger.log(`Creating user: ${userData.email}`);

    // check allowed role creation by user role
    const allowedRoles = rolePermissions[user.role];

    if (!allowedRoles?.includes(userData.role)) {
      throw new ForbiddenException(
        `${user.role} is not allowed to assign a user with role ${userData.role}`,
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
}
