import { OfficeType, Section, UserRole } from '../../generated/prisma/enums.js';
import { Tier, tierOf } from './tier.js';

// Who may create or manage which accounts (REQUIREMENTS.md §7.2, §7.4).

export interface ActingAdmin {
  role: UserRole;
  officeId: string;
  officeType: OfficeType;
}

export interface TargetOffice {
  id: string;
  type: OfficeType;
  parentId: string | null;
  regionId: string | null;
}

// Offices where each role may hold an account.
const ROLE_TIERS: Record<UserRole, Tier[]> = {
  [UserRole.SUPER_ADMIN]: ['NHQ'],
  [UserRole.ADMIN]: ['NHQ', 'REGIONAL', 'DISTRICT_PROVINCE', 'STATION'],
  [UserRole.ENCODER]: ['STATION'],
  [UserRole.VIEWER]: ['NHQ', 'REGIONAL', 'DISTRICT_PROVINCE', 'STATION'],
};

export function roleAllowedAtOffice(
  role: UserRole,
  officeType: OfficeType,
): boolean {
  return ROLE_TIERS[role].includes(tierOf(officeType));
}

// Section rules for an account (FR-USR-002): required for encoders and
// station viewers, optional for viewers above station level, refused for admins.
export function sectionError(
  role: UserRole,
  officeType: OfficeType,
  section: Section | null | undefined,
): string | null {
  if (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) {
    return section ? 'Administrators do not have a section.' : null;
  }

  if (!section && (role === UserRole.ENCODER || tierOf(officeType) === 'STATION')) {
    return 'A section (Operations, EMS or SRF) is required for this account.';
  }

  return null;
}

// Whether the acting admin may give `role` to an account at `office`.
// SUPER_ADMIN can never be granted through the API.
export function canAssign(
  actor: ActingAdmin,
  role: UserRole,
  office: TargetOffice,
): boolean {
  if (role === UserRole.SUPER_ADMIN) {
    return false;
  }

  if (!roleAllowedAtOffice(role, office.type)) {
    return false;
  }

  if (actor.role === UserRole.SUPER_ADMIN) {
    return true;
  }

  if (actor.role !== UserRole.ADMIN) {
    return false;
  }

  const targetTier = tierOf(office.type);
  const isOwnOffice = office.id === actor.officeId;

  switch (tierOf(actor.officeType)) {
    case 'NHQ':
      return true;

    case 'REGIONAL':
      // Within the region; only NHQ creates regional admins.
      if (!(isOwnOffice || office.regionId === actor.officeId)) {
        return false;
      }
      return !(role === UserRole.ADMIN && targetTier === 'REGIONAL');

    case 'DISTRICT_PROVINCE':
      // Its stations, plus viewers in its own office.
      if (isOwnOffice) {
        return role === UserRole.VIEWER;
      }
      return office.parentId === actor.officeId;

    case 'STATION':
      // Encoders and viewers of its own station.
      return isOwnOffice && role !== UserRole.ADMIN;
  }
}

// Whether the acting admin may manage (edit, (de)activate, reset) an existing
// account: they must be able to grant its current role at its current office.
// SUPER_ADMIN may also manage its own account.
export function canManageAccount(
  actor: ActingAdmin,
  target: { role: UserRole; office: TargetOffice },
): boolean {
  if (actor.role === UserRole.SUPER_ADMIN) {
    return true;
  }
  return canAssign(actor, target.role, target.office);
}
