import { ForbiddenException, Injectable } from '@nestjs/common';
import { OfficeType } from '../../../generated/prisma/enums.js';
import { officePermissions } from '../utils/office.permissions.js';
import { CurrentUserJwtPayload } from '../../../types/jwt.payload.js';

@Injectable()
export class OfficeAuthorizationService {
  canManageOffice(user: CurrentUserJwtPayload, officeType: OfficeType): void {
    const allowedOfficeTypes = officePermissions[user.role];

    if (!allowedOfficeTypes?.includes(officeType)) {
      throw new ForbiddenException(
        `${user.role} is not allowed to manage a ${officeType}`,
      );
    }
  }
}
