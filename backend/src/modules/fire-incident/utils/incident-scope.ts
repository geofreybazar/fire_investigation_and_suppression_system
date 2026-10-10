import { ForbiddenException } from '@nestjs/common';
import {
  IncidentApprovalStatus,
  OfficeType,
  ROLE,
} from '../../../generated/prisma/enums.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { CurrentUserJwtPayload } from '../../../types/jwt.payload.js';

// Who may see which incidents (docs/REQUIREMENTS.md §6.3).

// May submit incidents and change their data and timeline.
export const INCIDENT_EDITOR_ROLES: ROLE[] = [
  ROLE.CITY_MUNICIPALITY_OPERATION_STAFF,
  ROLE.CITY_MUNICIPALITY_COMMEL,
];

// The station operations group: also sees its station's pending and rejected incidents.
export const STATION_OPERATIONS_ROLES: ROLE[] = [
  ...INCIDENT_EDITOR_ROLES,
  ROLE.CITY_MUNICIPALITY_OPERATION,
];

// Admins below SUPER_ADMIN manage users and offices only.
const NO_INCIDENT_ACCESS: ROLE[] = [ROLE.NHQ_ADMIN, ROLE.REGIONAL_ADMIN];

// May view incidents (within their scope): every role except the above.
export const INCIDENT_VIEWER_ROLES: ROLE[] = Object.values(ROLE).filter(
  (role) => !NO_INCIDENT_ACCESS.includes(role),
);

export interface ViewerScope {
  user: CurrentUserJwtPayload;
  officeType: OfficeType;
}

export interface IncidentVisibilityFields {
  officeId: string;
  approvalStatus: IncidentApprovalStatus;
  deletedAt: Date | null;
  office: { id: string; parentId: string | null; regionId: string | null };
}

function assertMayViewIncidents(user: CurrentUserJwtPayload): void {
  if (NO_INCIDENT_ACCESS.includes(user.role)) {
    throw new ForbiddenException('You are not allowed to view fire incidents.');
  }
}

function seesAllOffices({ user, officeType }: ViewerScope): boolean {
  return (
    user.role === ROLE.SUPER_ADMIN ||
    officeType === OfficeType.NATIONAL_HEADQUARTERS
  );
}

function seesUnapproved(user: CurrentUserJwtPayload): boolean {
  return (
    user.role === ROLE.SUPER_ADMIN ||
    STATION_OPERATIONS_ROLES.includes(user.role)
  );
}

// Prisma filter for the incidents a viewer may list. Deleted incidents are
// never included; SUPER_ADMIN reads those through a separate listing.
export function incidentScopeWhere(
  scope: ViewerScope,
): Prisma.FireIncidentWhereInput {
  assertMayViewIncidents(scope.user);

  const officeId = scope.user.officeId;

  return {
    deletedAt: null,
    ...(!seesAllOffices(scope) && {
      // The hierarchy is fixed (station → district/province → region → NHQ),
      // so a station is below the viewer exactly when one of these matches.
      office: {
        OR: [{ id: officeId }, { parentId: officeId }, { regionId: officeId }],
      },
    }),
    ...(!seesUnapproved(scope.user) && {
      approvalStatus: IncidentApprovalStatus.APPROVED,
    }),
  };
}

// The same rule for a single, already-loaded incident.
export function isIncidentVisible(
  incident: IncidentVisibilityFields,
  scope: ViewerScope,
): boolean {
  assertMayViewIncidents(scope.user);

  if (incident.deletedAt !== null) {
    return false;
  }

  const officeId = scope.user.officeId;
  const inOffices =
    seesAllOffices(scope) ||
    incident.office.id === officeId ||
    incident.office.parentId === officeId ||
    incident.office.regionId === officeId;

  const approvalVisible =
    seesUnapproved(scope.user) ||
    incident.approvalStatus === IncidentApprovalStatus.APPROVED;

  return inOffices && approvalVisible;
}
