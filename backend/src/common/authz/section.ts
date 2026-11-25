import { ForbiddenException } from '@nestjs/common';
import {
  ResponseType,
  Section,
  UserRole,
} from '../../generated/prisma/enums.js';

// A section records exactly one response type (REQUIREMENTS.md FR-RT-001).
export const SECTION_RESPONSE_TYPE: Record<Section, ResponseType> = {
  [Section.OPERATIONS]: ResponseType.FIRE,
  [Section.EMS]: ResponseType.EMS,
  [Section.SRF]: ResponseType.SPECIAL_RESCUE,
};

const SECTION_LABEL: Record<Section, string> = {
  [Section.OPERATIONS]: 'Operations',
  [Section.EMS]: 'EMS',
  [Section.SRF]: 'SRF',
};

const RESPONSE_TYPE_LABEL: Record<ResponseType, string> = {
  [ResponseType.FIRE]: 'Fire',
  [ResponseType.EMS]: 'EMS',
  [ResponseType.SPECIAL_RESCUE]: 'Special Rescue',
};

export function sectionResponseType(section: Section): ResponseType {
  return SECTION_RESPONSE_TYPE[section];
}

// The response type whose records a user is limited to, or null when the
// user sees every response type (admins and viewers without a section).
export function sectionResponseTypeFilter(user: {
  role: UserRole;
  section: Section | null;
}): ResponseType | null {
  if (user.role === UserRole.ENCODER || user.role === UserRole.VIEWER) {
    return user.section ? sectionResponseType(user.section) : null;
  }
  return null;
}

// Writes need a matching section (FR-SEC-001, FR-SEC-003). Station admins
// have no section and may record every response type (Q-02 default).
export function assertSectionMayRecord(
  user: { role: UserRole; section: Section | null },
  responseType: ResponseType,
): void {
  if (user.role !== UserRole.ENCODER) {
    return;
  }

  if (!user.section) {
    throw new ForbiddenException('Your account has no section assigned.');
  }

  if (sectionResponseType(user.section) !== responseType) {
    throw new ForbiddenException(
      `Your section (${SECTION_LABEL[user.section]}) cannot record ${RESPONSE_TYPE_LABEL[responseType]} incidents.`,
    );
  }
}
