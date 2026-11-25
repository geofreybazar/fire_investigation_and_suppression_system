import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UUID } from 'crypto';
import { CurrentUserJwtPayload } from '../../../types/jwt.payload.js';
import { UsersRepository } from '../users.repository.js';
import {
  canAssign,
  canManageAccount,
  sectionError,
  TargetOffice,
} from '../../../common/authz/user-assignment.js';
import {
  OfficeType,
  Section,
  UserRole,
} from '../../../generated/prisma/enums.js';

@Injectable()
export class UsersAuthorizationService {
  constructor(private readonly usersRepository: UsersRepository) {}

  // An admin may manage an account whose current role they could grant at
  // its current office (REQUIREMENTS.md §7.2). Returns the target's role
  // and office for callers comparing them with the requested change.
  async assertCanManageUser(userId: UUID, currentUser: CurrentUserJwtPayload) {
    const target = await this.usersRepository.findUserRoleById(userId);

    if (!target) {
      throw new NotFoundException('User not found.');
    }

    if (!canManageAccount(currentUser, target)) {
      throw new ForbiddenException('You are not allowed to manage this user.');
    }

    return target;
  }

  // The role, office and section a create or edit asks for.
  assertCanAssign(
    currentUser: CurrentUserJwtPayload,
    role: UserRole,
    office: TargetOffice & { type: OfficeType },
    section: Section | null,
  ): void {
    if (role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'The SUPER_ADMIN role cannot be granted through the API.',
      );
    }

    if (!canAssign(currentUser, role, office)) {
      throw new ForbiddenException(
        `You are not allowed to assign the ${role} role at this office.`,
      );
    }

    const error = sectionError(role, office.type, section);
    if (error) {
      throw new BadRequestException(error);
    }
  }
}
