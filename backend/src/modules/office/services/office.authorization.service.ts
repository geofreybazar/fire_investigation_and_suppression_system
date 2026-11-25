import { ForbiddenException, Injectable } from '@nestjs/common';
import { OfficeType } from '../../../generated/prisma/enums.js';
import { manageableOfficeTypes } from '../utils/office.permissions.js';
import { CurrentUserJwtPayload } from '../../../types/jwt.payload.js';
import {
  isOfficeInScope,
  ScopedOffice,
} from '../../../common/scope/jurisdiction.js';

@Injectable()
export class OfficeAuthorizationService {
  canManageOffice(user: CurrentUserJwtPayload, officeType: OfficeType): void {
    if (!manageableOfficeTypes(user).includes(officeType)) {
      throw new ForbiddenException(
        `You are not allowed to manage a ${officeType}`,
      );
    }
  }

  // The office must be in the user's jurisdiction (REQUIREMENTS.md §2.2).
  assertOfficeInScope(
    user: CurrentUserJwtPayload,
    office: ScopedOffice,
    message = 'You can only manage offices within your own jurisdiction',
  ): void {
    if (!isOfficeInScope(office, user)) {
      throw new ForbiddenException(message);
    }
  }
}
