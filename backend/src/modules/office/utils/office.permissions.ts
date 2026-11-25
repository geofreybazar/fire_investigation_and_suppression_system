import { OfficeType } from '../../../generated/prisma/enums.js';
import { hasPermission, Permission } from '../../../common/authz/permissions.js';
import { tierOf } from '../../../common/authz/tier.js';
import { CurrentUserJwtPayload } from '../../../types/jwt.payload.js';

// Office types each office manager may create, edit or delete (KEPT from
// FIIS, REQUIREMENTS.md §7.2). Scope is checked separately.
const BELOW_NHQ: OfficeType[] = [
  OfficeType.REGIONAL_OFFICE,
  OfficeType.DISTRICT_FIRE_STATION,
  OfficeType.PROVINCIAL_FIRE_STATION,
  OfficeType.CITY_FIRE_STATION,
  OfficeType.MUNICIPAL_FIRE_STATION,
];

const BELOW_REGION: OfficeType[] = BELOW_NHQ.filter(
  (type) => type !== OfficeType.REGIONAL_OFFICE,
);

export function manageableOfficeTypes(
  user: Pick<CurrentUserJwtPayload, 'role' | 'officeType'>,
): OfficeType[] {
  if (user.role === 'SUPER_ADMIN') {
    return Object.values(OfficeType);
  }

  if (!hasPermission(user, Permission.OFFICE_MANAGE)) {
    return [];
  }

  return tierOf(user.officeType) === 'NHQ' ? BELOW_NHQ : BELOW_REGION;
}
