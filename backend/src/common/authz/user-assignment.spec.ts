import { describe, expect, it } from 'vitest';
import {
  OfficeType,
  Section,
  UserRole,
} from '../../generated/prisma/enums.js';
import {
  ActingAdmin,
  canAssign,
  canManageAccount,
  roleAllowedAtOffice,
  sectionError,
  TargetOffice,
} from './user-assignment.js';

// NHQ → Region A → Province A → Station A1; Region B → Province B → Station B1.
const nhq: TargetOffice = {
  id: 'nhq',
  type: OfficeType.NATIONAL_HEADQUARTERS,
  parentId: null,
  regionId: null,
};
const regionA: TargetOffice = {
  id: 'region-a',
  type: OfficeType.REGIONAL_OFFICE,
  parentId: 'nhq',
  regionId: null,
};
const provinceA: TargetOffice = {
  id: 'province-a',
  type: OfficeType.PROVINCIAL_FIRE_STATION,
  parentId: 'region-a',
  regionId: 'region-a',
};
const stationA1: TargetOffice = {
  id: 'station-a1',
  type: OfficeType.CITY_FIRE_STATION,
  parentId: 'province-a',
  regionId: 'region-a',
};
const stationA2: TargetOffice = { ...stationA1, id: 'station-a2' };
const stationB1: TargetOffice = {
  id: 'station-b1',
  type: OfficeType.MUNICIPAL_FIRE_STATION,
  parentId: 'province-b',
  regionId: 'region-b',
};

const admin = (office: TargetOffice): ActingAdmin => ({
  role: UserRole.ADMIN,
  officeId: office.id,
  officeType: office.type,
});
const superAdmin: ActingAdmin = {
  role: UserRole.SUPER_ADMIN,
  officeId: nhq.id,
  officeType: nhq.type,
};

describe('roleAllowedAtOffice', () => {
  it('allows encoders only at stations', () => {
    expect(roleAllowedAtOffice(UserRole.ENCODER, stationA1.type)).toBe(true);
    expect(roleAllowedAtOffice(UserRole.ENCODER, provinceA.type)).toBe(false);
    expect(roleAllowedAtOffice(UserRole.ENCODER, nhq.type)).toBe(false);
  });

  it('allows admins and viewers at every tier', () => {
    for (const office of [nhq, regionA, provinceA, stationA1]) {
      expect(roleAllowedAtOffice(UserRole.ADMIN, office.type)).toBe(true);
      expect(roleAllowedAtOffice(UserRole.VIEWER, office.type)).toBe(true);
    }
  });
});

describe('sectionError', () => {
  it('requires a section for encoders and station viewers', () => {
    expect(sectionError(UserRole.ENCODER, stationA1.type, null)).not.toBeNull();
    expect(sectionError(UserRole.VIEWER, stationA1.type, null)).not.toBeNull();
    expect(sectionError(UserRole.ENCODER, stationA1.type, Section.EMS)).toBeNull();
  });

  it('makes the section optional for viewers above station level', () => {
    expect(sectionError(UserRole.VIEWER, provinceA.type, null)).toBeNull();
    expect(sectionError(UserRole.VIEWER, regionA.type, Section.SRF)).toBeNull();
  });

  it('refuses a section on admin accounts', () => {
    expect(
      sectionError(UserRole.ADMIN, stationA1.type, Section.OPERATIONS),
    ).not.toBeNull();
    expect(sectionError(UserRole.ADMIN, stationA1.type, null)).toBeNull();
  });
});

describe('canAssign', () => {
  it('never grants SUPER_ADMIN', () => {
    expect(canAssign(superAdmin, UserRole.SUPER_ADMIN, nhq)).toBe(false);
    expect(canAssign(admin(nhq), UserRole.SUPER_ADMIN, nhq)).toBe(false);
  });

  it('refuses a role at an office type it cannot hold', () => {
    expect(canAssign(superAdmin, UserRole.ENCODER, regionA)).toBe(false);
  });

  it('lets SUPER_ADMIN and NHQ admins assign anywhere, including regional admins', () => {
    expect(canAssign(superAdmin, UserRole.ADMIN, regionA)).toBe(true);
    expect(canAssign(admin(nhq), UserRole.ADMIN, regionA)).toBe(true);
    expect(canAssign(admin(nhq), UserRole.ENCODER, stationB1)).toBe(true);
  });

  describe('regional admin', () => {
    const actor = admin(regionA);

    it('assigns admins, encoders and viewers within the region', () => {
      expect(canAssign(actor, UserRole.ADMIN, provinceA)).toBe(true);
      expect(canAssign(actor, UserRole.ADMIN, stationA1)).toBe(true);
      expect(canAssign(actor, UserRole.ENCODER, stationA1)).toBe(true);
      expect(canAssign(actor, UserRole.VIEWER, regionA)).toBe(true);
    });

    it('cannot create regional admins (only NHQ can)', () => {
      expect(canAssign(actor, UserRole.ADMIN, regionA)).toBe(false);
    });

    it('cannot assign outside the region', () => {
      expect(canAssign(actor, UserRole.ENCODER, stationB1)).toBe(false);
      expect(canAssign(actor, UserRole.VIEWER, nhq)).toBe(false);
    });
  });

  describe('district/provincial admin', () => {
    const actor = admin(provinceA);

    it('assigns admins, encoders and viewers in its stations', () => {
      expect(canAssign(actor, UserRole.ADMIN, stationA1)).toBe(true);
      expect(canAssign(actor, UserRole.ENCODER, stationA2)).toBe(true);
    });

    it('assigns only viewers in its own office', () => {
      expect(canAssign(actor, UserRole.VIEWER, provinceA)).toBe(true);
      expect(canAssign(actor, UserRole.ADMIN, provinceA)).toBe(false);
    });

    it('cannot assign at the region or other provinces', () => {
      expect(canAssign(actor, UserRole.VIEWER, regionA)).toBe(false);
      expect(canAssign(actor, UserRole.ENCODER, stationB1)).toBe(false);
    });
  });

  describe('station admin', () => {
    const actor = admin(stationA1);

    it('assigns encoders and viewers in its own station', () => {
      expect(canAssign(actor, UserRole.ENCODER, stationA1)).toBe(true);
      expect(canAssign(actor, UserRole.VIEWER, stationA1)).toBe(true);
    });

    it('cannot create admins or reach other stations', () => {
      expect(canAssign(actor, UserRole.ADMIN, stationA1)).toBe(false);
      expect(canAssign(actor, UserRole.ENCODER, stationA2)).toBe(false);
    });
  });

  it('gives encoders and viewers no assignment rights', () => {
    const encoder: ActingAdmin = { ...admin(stationA1), role: UserRole.ENCODER };
    expect(canAssign(encoder, UserRole.VIEWER, stationA1)).toBe(false);
  });
});

describe('canManageAccount', () => {
  it('follows canAssign for the account’s current role and office', () => {
    expect(
      canManageAccount(admin(regionA), {
        role: UserRole.ENCODER,
        office: stationA1,
      }),
    ).toBe(true);
    expect(
      canManageAccount(admin(regionA), {
        role: UserRole.ADMIN,
        office: regionA,
      }),
    ).toBe(false);
  });

  it('lets SUPER_ADMIN manage every account, including its own', () => {
    expect(
      canManageAccount(superAdmin, { role: UserRole.SUPER_ADMIN, office: nhq }),
    ).toBe(true);
  });
});
