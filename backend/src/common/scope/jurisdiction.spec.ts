import { describe, expect, it } from 'vitest';
import {
  OfficeType,
  ResponseType,
  Section,
  UserRole,
} from '../../generated/prisma/enums.js';
import {
  isInJurisdiction,
  isOfficeInScope,
  jurisdictionWhere,
  officeScopeWhere,
} from './jurisdiction.js';

const user = (
  role: UserRole,
  officeType: OfficeType,
  officeId: string,
  section: Section | null = null,
) => ({ role, officeType, officeId, section });

const stationA1 = { id: 'station-a1', parentId: 'province-a', regionId: 'region-a' };
const stationB1 = { id: 'station-b1', parentId: 'province-b', regionId: 'region-b' };

const incident = (
  reportingOffice: typeof stationA1,
  responseType: ResponseType = ResponseType.FIRE,
  deletedAt: Date | null = null,
) => ({ reportingOffice, responseType, deletedAt });

describe('officeScopeWhere', () => {
  it('has no office filter for SUPER_ADMIN and NHQ users', () => {
    expect(
      officeScopeWhere(user(UserRole.SUPER_ADMIN, OfficeType.NATIONAL_HEADQUARTERS, 'nhq')),
    ).toEqual({});
    expect(
      officeScopeWhere(user(UserRole.VIEWER, OfficeType.NATIONAL_HEADQUARTERS, 'nhq')),
    ).toEqual({});
  });

  it('uses the region for regional users', () => {
    expect(
      officeScopeWhere(user(UserRole.ADMIN, OfficeType.REGIONAL_OFFICE, 'region-a')),
    ).toEqual({ OR: [{ id: 'region-a' }, { regionId: 'region-a' }] });
  });

  it('uses the parent for district and provincial users', () => {
    expect(
      officeScopeWhere(
        user(UserRole.VIEWER, OfficeType.DISTRICT_FIRE_STATION, 'province-a'),
      ),
    ).toEqual({ OR: [{ id: 'province-a' }, { parentId: 'province-a' }] });
  });

  it('limits station users to their own station', () => {
    expect(
      officeScopeWhere(user(UserRole.ENCODER, OfficeType.CITY_FIRE_STATION, 'station-a1')),
    ).toEqual({ id: 'station-a1' });
  });
});

describe('isOfficeInScope', () => {
  it.each([
    [OfficeType.NATIONAL_HEADQUARTERS, 'nhq', true, true],
    [OfficeType.REGIONAL_OFFICE, 'region-a', true, false],
    [OfficeType.PROVINCIAL_FIRE_STATION, 'province-a', true, false],
    [OfficeType.CITY_FIRE_STATION, 'station-a1', true, false],
    [OfficeType.MUNICIPAL_FIRE_STATION, 'station-a2', false, false],
  ])('a %s user (%s) sees A1: %s, B1: %s', (type, id, seesA1, seesB1) => {
    const viewer = user(UserRole.VIEWER, type, id);
    expect(isOfficeInScope(stationA1, viewer)).toBe(seesA1);
    expect(isOfficeInScope(stationB1, viewer)).toBe(seesB1);
  });
});

describe('jurisdictionWhere', () => {
  it('excludes deleted incidents and adds the section filter for encoders', () => {
    expect(
      jurisdictionWhere(
        user(UserRole.ENCODER, OfficeType.CITY_FIRE_STATION, 'station-a1', Section.SRF),
      ),
    ).toEqual({
      deletedAt: null,
      reportingOffice: { id: 'station-a1' },
      responseType: ResponseType.SPECIAL_RESCUE,
    });
  });

  it('has only the deletion filter for NHQ admins', () => {
    expect(
      jurisdictionWhere(user(UserRole.ADMIN, OfficeType.NATIONAL_HEADQUARTERS, 'nhq')),
    ).toEqual({ deletedAt: null });
  });

  it('does not filter by section for viewers without one', () => {
    expect(
      jurisdictionWhere(user(UserRole.VIEWER, OfficeType.REGIONAL_OFFICE, 'region-a')),
    ).toEqual({
      deletedAt: null,
      reportingOffice: { OR: [{ id: 'region-a' }, { regionId: 'region-a' }] },
    });
  });
});

describe('isInJurisdiction', () => {
  const emsEncoder = user(
    UserRole.ENCODER,
    OfficeType.CITY_FIRE_STATION,
    'station-a1',
    Section.EMS,
  );

  it('accepts an incident of the encoder’s station and section', () => {
    expect(isInJurisdiction(incident(stationA1, ResponseType.EMS), emsEncoder)).toBe(true);
  });

  it('rejects another section’s incident at the same station', () => {
    expect(isInJurisdiction(incident(stationA1, ResponseType.FIRE), emsEncoder)).toBe(false);
  });

  it('rejects another station’s incident', () => {
    expect(isInJurisdiction(incident(stationB1, ResponseType.EMS), emsEncoder)).toBe(false);
  });

  it('rejects deleted incidents, even for SUPER_ADMIN', () => {
    const superAdmin = user(UserRole.SUPER_ADMIN, OfficeType.NATIONAL_HEADQUARTERS, 'nhq');
    expect(
      isInJurisdiction(incident(stationA1, ResponseType.FIRE, new Date()), superAdmin),
    ).toBe(false);
  });
});
