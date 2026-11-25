import { describe, expect, it } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import {
  ResponseType,
  Section,
  UserRole,
} from '../../generated/prisma/enums.js';
import {
  assertSectionMayRecord,
  sectionResponseType,
  sectionResponseTypeFilter,
} from './section.js';

describe('sectionResponseType', () => {
  it('maps each section to its one response type', () => {
    expect(sectionResponseType(Section.OPERATIONS)).toBe(ResponseType.FIRE);
    expect(sectionResponseType(Section.EMS)).toBe(ResponseType.EMS);
    expect(sectionResponseType(Section.SRF)).toBe(ResponseType.SPECIAL_RESCUE);
  });
});

describe('sectionResponseTypeFilter', () => {
  it('limits encoders and section viewers to their response type', () => {
    expect(
      sectionResponseTypeFilter({ role: UserRole.ENCODER, section: Section.EMS }),
    ).toBe(ResponseType.EMS);
    expect(
      sectionResponseTypeFilter({ role: UserRole.VIEWER, section: Section.SRF }),
    ).toBe(ResponseType.SPECIAL_RESCUE);
  });

  it('does not limit admins or viewers without a section', () => {
    expect(
      sectionResponseTypeFilter({ role: UserRole.ADMIN, section: null }),
    ).toBeNull();
    expect(
      sectionResponseTypeFilter({ role: UserRole.VIEWER, section: null }),
    ).toBeNull();
  });
});

describe('assertSectionMayRecord', () => {
  it('lets an encoder record their own section’s response type', () => {
    expect(() =>
      assertSectionMayRecord(
        { role: UserRole.ENCODER, section: Section.OPERATIONS },
        ResponseType.FIRE,
      ),
    ).not.toThrow();
  });

  it('refuses another response type, naming the section', () => {
    expect(() =>
      assertSectionMayRecord(
        { role: UserRole.ENCODER, section: Section.EMS },
        ResponseType.FIRE,
      ),
    ).toThrow(
      new ForbiddenException('Your section (EMS) cannot record Fire incidents.'),
    );
  });

  it('refuses an encoder without a section', () => {
    expect(() =>
      assertSectionMayRecord(
        { role: UserRole.ENCODER, section: null },
        ResponseType.EMS,
      ),
    ).toThrow(ForbiddenException);
  });

  it('does not restrict station admins by section', () => {
    expect(() =>
      assertSectionMayRecord(
        { role: UserRole.ADMIN, section: null },
        ResponseType.SPECIAL_RESCUE,
      ),
    ).not.toThrow();
  });
});
