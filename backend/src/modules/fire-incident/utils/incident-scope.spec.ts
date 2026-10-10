import { ForbiddenException } from '@nestjs/common';
import { type UUID } from 'crypto';
import {
  IncidentApprovalStatus,
  OfficeType,
  type ROLE,
} from '../../../generated/prisma/enums.js';
import { type CurrentUserJwtPayload } from '../../../types/jwt.payload.js';
import {
  incidentScopeWhere,
  isIncidentVisible,
  type IncidentVisibilityFields,
  type ViewerScope,
} from './incident-scope.js';

const NHQ = 'nhq';
const REGION = 'region-1';
const DISTRICT = 'district-1';
const STATION = 'station-1';

const viewer = (
  role: ROLE,
  officeId: string,
  officeType: OfficeType,
): ViewerScope => ({
  user: {
    sub: '11111111-1111-4111-8111-111111111111' as UUID,
    account_number: 'ACC001',
    role,
    positionId: 'position-1',
    officeId,
  } as CurrentUserJwtPayload,
  officeType,
});

const incident = (
  overrides: Partial<IncidentVisibilityFields> = {},
): IncidentVisibilityFields => ({
  officeId: STATION,
  approvalStatus: IncidentApprovalStatus.APPROVED,
  deletedAt: null,
  office: { id: STATION, parentId: DISTRICT, regionId: REGION },
  ...overrides,
});

const stationStaff = viewer(
  'CITY_MUNICIPALITY_OPERATION_STAFF',
  STATION,
  OfficeType.CITY_FIRE_STATION,
);
const stationInvestigator = viewer(
  'CITY_MUNICIPALITY_INVESTIGATOR',
  STATION,
  OfficeType.CITY_FIRE_STATION,
);
const districtViewer = viewer(
  'DISTRICT_PROVINCE_VIEWER',
  DISTRICT,
  OfficeType.DISTRICT_FIRE_STATION,
);
const regionalInvestigator = viewer(
  'REGIONAL_INVESTIGATOR',
  REGION,
  OfficeType.REGIONAL_OFFICE,
);
const nhqViewer = viewer('NHQ_VIEWER', NHQ, OfficeType.NATIONAL_HEADQUARTERS);
const superAdmin = viewer('SUPER_ADMIN', NHQ, OfficeType.NATIONAL_HEADQUARTERS);

describe('incident scope', () => {
  describe('incidentScopeWhere', () => {
    it('limits a station user to their own station, including unapproved incidents', () => {
      expect(incidentScopeWhere(stationStaff)).toEqual({
        deletedAt: null,
        office: {
          OR: [{ id: STATION }, { parentId: STATION }, { regionId: STATION }],
        },
      });
    });

    it('limits a district user to stations below it, approved only', () => {
      expect(incidentScopeWhere(districtViewer)).toEqual({
        deletedAt: null,
        office: {
          OR: [
            { id: DISTRICT },
            { parentId: DISTRICT },
            { regionId: DISTRICT },
          ],
        },
        approvalStatus: IncidentApprovalStatus.APPROVED,
      });
    });

    it('gives NHQ users every office, approved only', () => {
      expect(incidentScopeWhere(nhqViewer)).toEqual({
        deletedAt: null,
        approvalStatus: IncidentApprovalStatus.APPROVED,
      });
    });

    it('gives SUPER_ADMIN everything that is not deleted', () => {
      expect(incidentScopeWhere(superAdmin)).toEqual({ deletedAt: null });
    });

    it.each(['NHQ_ADMIN', 'REGIONAL_ADMIN'] as ROLE[])('forbids %s', (role) => {
      expect(() =>
        incidentScopeWhere(viewer(role, REGION, OfficeType.REGIONAL_OFFICE)),
      ).toThrow(ForbiddenException);
    });
  });

  describe('isIncidentVisible', () => {
    it.each([
      ['station staff', stationStaff],
      ['the station investigator', stationInvestigator],
      ['the district viewer', districtViewer],
      ['the regional investigator', regionalInvestigator],
      ['an NHQ viewer', nhqViewer],
      ['SUPER_ADMIN', superAdmin],
    ])('shows an approved incident in scope to %s', (_label, scope) => {
      expect(isIncidentVisible(incident(), scope)).toBe(true);
    });

    it('hides an incident from another region', () => {
      expect(
        isIncidentVisible(
          incident({
            office: {
              id: 'station-9',
              parentId: 'district-9',
              regionId: 'region-9',
            },
          }),
          regionalInvestigator,
        ),
      ).toBe(false);
    });

    it('hides an incident of a sibling district', () => {
      expect(
        isIncidentVisible(
          incident({
            office: {
              id: 'station-2',
              parentId: 'district-2',
              regionId: REGION,
            },
          }),
          districtViewer,
        ),
      ).toBe(false);
    });

    it.each([IncidentApprovalStatus.PENDING, IncidentApprovalStatus.REJECTED])(
      'shows a %s incident only to the station operations group and SUPER_ADMIN',
      (approvalStatus) => {
        const unapproved = incident({ approvalStatus });

        expect(isIncidentVisible(unapproved, stationStaff)).toBe(true);
        expect(
          isIncidentVisible(
            unapproved,
            viewer(
              'CITY_MUNICIPALITY_OPERATION',
              STATION,
              OfficeType.CITY_FIRE_STATION,
            ),
          ),
        ).toBe(true);
        expect(isIncidentVisible(unapproved, superAdmin)).toBe(true);
        expect(isIncidentVisible(unapproved, stationInvestigator)).toBe(false);
        expect(isIncidentVisible(unapproved, districtViewer)).toBe(false);
        expect(isIncidentVisible(unapproved, nhqViewer)).toBe(false);
      },
    );

    it('hides deleted incidents from everyone, including SUPER_ADMIN', () => {
      const deleted = incident({ deletedAt: new Date() });

      expect(isIncidentVisible(deleted, stationStaff)).toBe(false);
      expect(isIncidentVisible(deleted, superAdmin)).toBe(false);
    });

    it('forbids NHQ_ADMIN', () => {
      expect(() =>
        isIncidentVisible(
          incident(),
          viewer('NHQ_ADMIN', NHQ, OfficeType.NATIONAL_HEADQUARTERS),
        ),
      ).toThrow(ForbiddenException);
    });
  });
});
