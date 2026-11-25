import { OfficeType, UserRole } from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';
import { sectionResponseTypeFilter } from '../authz/section.js';
import { tierOf } from '../authz/tier.js';
import { CurrentUserJwtPayload } from '../../types/jwt.payload.js';

// Which offices and records a user may see (REQUIREMENTS.md §2.2, FR-SCOPE-*).
// The hierarchy has a fixed depth (station → district/province → region →
// NHQ), so an office is in a user's jurisdiction exactly when it is the
// user's office, a child of it, or in its region.

type ScopeUser = Pick<
  CurrentUserJwtPayload,
  'role' | 'section' | 'officeId' | 'officeType'
>;

export interface ScopedOffice {
  id: string;
  parentId: string | null;
  regionId: string | null;
}

function seesAllOffices(user: ScopeUser): boolean {
  return (
    user.role === UserRole.SUPER_ADMIN ||
    user.officeType === OfficeType.NATIONAL_HEADQUARTERS
  );
}

// Prisma filter for the offices in the user's jurisdiction.
export function officeScopeWhere(user: ScopeUser): Prisma.OfficeWhereInput {
  if (seesAllOffices(user)) {
    return {};
  }

  switch (tierOf(user.officeType)) {
    case 'REGIONAL':
      return { OR: [{ id: user.officeId }, { regionId: user.officeId }] };
    case 'DISTRICT_PROVINCE':
      return { OR: [{ id: user.officeId }, { parentId: user.officeId }] };
    default:
      return { id: user.officeId };
  }
}

export function isOfficeInScope(office: ScopedOffice, user: ScopeUser): boolean {
  if (seesAllOffices(user)) {
    return true;
  }

  switch (tierOf(user.officeType)) {
    case 'REGIONAL':
      return office.id === user.officeId || office.regionId === user.officeId;
    case 'DISTRICT_PROVINCE':
      return office.id === user.officeId || office.parentId === user.officeId;
    default:
      return office.id === user.officeId;
  }
}

// Prisma filter for the incidents a user may see: non-deleted, reported by
// an office in jurisdiction, and of the user's section's response type.
export function jurisdictionWhere(user: ScopeUser): Prisma.IncidentWhereInput {
  const responseType = sectionResponseTypeFilter(user);
  const offices = officeScopeWhere(user);

  return {
    deletedAt: null,
    ...(Object.keys(offices).length > 0 && { reportingOffice: offices }),
    ...(responseType && { responseType }),
  };
}

// The same rule for one loaded incident. Callers answer 404 when false.
export function isInJurisdiction(
  incident: {
    deletedAt: Date | null;
    responseType: string;
    reportingOffice: ScopedOffice;
  },
  user: ScopeUser,
): boolean {
  if (incident.deletedAt !== null) {
    return false;
  }

  const responseType = sectionResponseTypeFilter(user);
  if (responseType && incident.responseType !== responseType) {
    return false;
  }

  return isOfficeInScope(incident.reportingOffice, user);
}
