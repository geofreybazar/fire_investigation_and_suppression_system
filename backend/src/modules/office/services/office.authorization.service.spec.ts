import { ForbiddenException } from '@nestjs/common';
import { type UUID } from 'crypto';
import { OfficeAuthorizationService } from './office.authorization.service.js';
import { type CurrentUserJwtPayload } from '../../../types/jwt.payload.js';
import {
  type OfficeType,
  type UserRole,
} from '../../../generated/prisma/enums.js';

const user = (
  role: UserRole,
  officeType: OfficeType,
  officeId = 'office-1',
): CurrentUserJwtPayload => ({
  sub: '11111111-1111-4111-8111-111111111111' as UUID,
  account_number: 'ACC001',
  role,
  section: null,
  positionId: 'position-1',
  officeId,
  officeType,
});

describe('OfficeAuthorizationService', () => {
  const service = new OfficeAuthorizationService();

  describe('canManageOffice', () => {
    it('allows SUPER_ADMIN to manage National Headquarters', () => {
      expect(() =>
        service.canManageOffice(
          user('SUPER_ADMIN', 'NATIONAL_HEADQUARTERS'),
          'NATIONAL_HEADQUARTERS',
        ),
      ).not.toThrow();
    });

    it('allows an NHQ admin to manage regional offices but not NHQ', () => {
      const nhqAdmin = user('ADMIN', 'NATIONAL_HEADQUARTERS');

      expect(() =>
        service.canManageOffice(nhqAdmin, 'REGIONAL_OFFICE'),
      ).not.toThrow();
      expect(() =>
        service.canManageOffice(nhqAdmin, 'NATIONAL_HEADQUARTERS'),
      ).toThrow(ForbiddenException);
    });

    it('allows a regional admin to manage stations but not regional offices', () => {
      const regionalAdmin = user('ADMIN', 'REGIONAL_OFFICE');

      expect(() =>
        service.canManageOffice(regionalAdmin, 'MUNICIPAL_FIRE_STATION'),
      ).not.toThrow();
      expect(() =>
        service.canManageOffice(regionalAdmin, 'REGIONAL_OFFICE'),
      ).toThrow('You are not allowed to manage a REGIONAL_OFFICE');
    });

    it('forbids provincial and station admins, encoders and viewers', () => {
      for (const actor of [
        user('ADMIN', 'PROVINCIAL_FIRE_STATION'),
        user('ADMIN', 'CITY_FIRE_STATION'),
        user('ENCODER', 'CITY_FIRE_STATION'),
        user('VIEWER', 'NATIONAL_HEADQUARTERS'),
      ]) {
        expect(() =>
          service.canManageOffice(actor, 'CITY_FIRE_STATION'),
        ).toThrow(ForbiddenException);
      }
    });
  });

  describe('assertOfficeInScope', () => {
    const regionalAdmin = user('ADMIN', 'REGIONAL_OFFICE', 'region-1');

    it('allows national users everywhere', () => {
      const office = { id: 'x', parentId: 'y', regionId: 'other-region' };
      expect(() =>
        service.assertOfficeInScope(
          user('SUPER_ADMIN', 'NATIONAL_HEADQUARTERS'),
          office,
        ),
      ).not.toThrow();
      expect(() =>
        service.assertOfficeInScope(
          user('ADMIN', 'NATIONAL_HEADQUARTERS'),
          office,
        ),
      ).not.toThrow();
    });

    it('allows a regional admin within their own region', () => {
      expect(() =>
        service.assertOfficeInScope(regionalAdmin, {
          id: 'region-1',
          parentId: 'nhq',
          regionId: null,
        }),
      ).not.toThrow();
      expect(() =>
        service.assertOfficeInScope(regionalAdmin, {
          id: 'station-1',
          parentId: 'district-1',
          regionId: 'region-1',
        }),
      ).not.toThrow();
    });

    it('forbids a regional admin outside their region, with the given message', () => {
      expect(() =>
        service.assertOfficeInScope(
          regionalAdmin,
          { id: 'station-2', parentId: 'district-2', regionId: 'region-2' },
          'custom message',
        ),
      ).toThrow('custom message');
    });

    it('limits a provincial admin to its own office and stations', () => {
      const provincialAdmin = user(
        'ADMIN',
        'PROVINCIAL_FIRE_STATION',
        'province-1',
      );

      expect(() =>
        service.assertOfficeInScope(provincialAdmin, {
          id: 'station-1',
          parentId: 'province-1',
          regionId: 'region-1',
        }),
      ).not.toThrow();
      expect(() =>
        service.assertOfficeInScope(provincialAdmin, {
          id: 'region-1',
          parentId: 'nhq',
          regionId: null,
        }),
      ).toThrow(ForbiddenException);
    });
  });
});
