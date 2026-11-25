import { describe, expect, it } from 'vitest';
import { OfficeType, UserRole } from '../../generated/prisma/enums.js';
import { hasPermission, Permission } from './permissions.js';

const NHQ = OfficeType.NATIONAL_HEADQUARTERS;
const REGION = OfficeType.REGIONAL_OFFICE;
const PROVINCE = OfficeType.PROVINCIAL_FIRE_STATION;
const STATION = OfficeType.CITY_FIRE_STATION;

const can = (role: UserRole, officeType: OfficeType, p: Permission) =>
  hasPermission({ role, officeType }, p);

// REQUIREMENTS.md §7.2, row by row.
describe('hasPermission', () => {
  it('lets only SUPER_ADMIN and NHQ admins manage reference data', () => {
    expect(can(UserRole.SUPER_ADMIN, NHQ, 'REFERENCE_MANAGE')).toBe(true);
    expect(can(UserRole.ADMIN, NHQ, 'REFERENCE_MANAGE')).toBe(true);
    expect(can(UserRole.ADMIN, REGION, 'REFERENCE_MANAGE')).toBe(false);
    expect(can(UserRole.ADMIN, STATION, 'REFERENCE_MANAGE')).toBe(false);
  });

  it('lets NHQ and regional admins manage offices, as in FIIS', () => {
    expect(can(UserRole.ADMIN, NHQ, 'OFFICE_MANAGE')).toBe(true);
    expect(can(UserRole.ADMIN, REGION, 'OFFICE_MANAGE')).toBe(true);
    expect(can(UserRole.ADMIN, PROVINCE, 'OFFICE_MANAGE')).toBe(false);
    expect(can(UserRole.ADMIN, STATION, 'OFFICE_MANAGE')).toBe(false);
  });

  it('lets admins at every tier manage users', () => {
    for (const type of [NHQ, REGION, PROVINCE, STATION]) {
      expect(can(UserRole.ADMIN, type, 'USER_MANAGE')).toBe(true);
    }
    expect(can(UserRole.ENCODER, STATION, 'USER_MANAGE')).toBe(false);
    expect(can(UserRole.VIEWER, NHQ, 'USER_MANAGE')).toBe(false);
  });

  it('allows record writes only at stations, by encoders and station admins', () => {
    expect(can(UserRole.ENCODER, STATION, 'RECORD_WRITE')).toBe(true);
    expect(can(UserRole.ADMIN, STATION, 'RECORD_WRITE')).toBe(true);
    expect(can(UserRole.ADMIN, PROVINCE, 'RECORD_WRITE')).toBe(false);
    expect(can(UserRole.ADMIN, NHQ, 'RECORD_WRITE')).toBe(false);
    expect(can(UserRole.SUPER_ADMIN, NHQ, 'RECORD_WRITE')).toBe(false);
    expect(can(UserRole.VIEWER, STATION, 'RECORD_WRITE')).toBe(false);
  });

  it('lets station admins and SUPER_ADMIN delete, and only SUPER_ADMIN restore', () => {
    expect(can(UserRole.ADMIN, STATION, 'RECORD_DELETE')).toBe(true);
    expect(can(UserRole.SUPER_ADMIN, NHQ, 'RECORD_DELETE')).toBe(true);
    expect(can(UserRole.ENCODER, STATION, 'RECORD_DELETE')).toBe(false);
    expect(can(UserRole.ADMIN, REGION, 'RECORD_DELETE')).toBe(false);
    expect(can(UserRole.SUPER_ADMIN, NHQ, 'RECORD_RESTORE')).toBe(true);
    expect(can(UserRole.ADMIN, STATION, 'RECORD_RESTORE')).toBe(false);
  });

  it('masks personal information for viewers above station level', () => {
    expect(can(UserRole.VIEWER, STATION, 'PII_VIEW')).toBe(true);
    expect(can(UserRole.VIEWER, PROVINCE, 'PII_VIEW')).toBe(false);
    expect(can(UserRole.VIEWER, NHQ, 'PII_VIEW')).toBe(false);
    expect(can(UserRole.ADMIN, REGION, 'PII_VIEW')).toBe(true);
  });

  it('hides medical details from viewers', () => {
    expect(can(UserRole.VIEWER, STATION, 'MEDICAL_VIEW')).toBe(false);
    expect(can(UserRole.ENCODER, STATION, 'MEDICAL_VIEW')).toBe(true);
    expect(can(UserRole.ADMIN, NHQ, 'MEDICAL_VIEW')).toBe(true);
  });

  it('limits exports with personal information to admins', () => {
    expect(can(UserRole.ADMIN, STATION, 'EXPORT_PII')).toBe(true);
    expect(can(UserRole.ENCODER, STATION, 'EXPORT_PII')).toBe(false);
    expect(can(UserRole.VIEWER, NHQ, 'EXPORT_PII')).toBe(false);
    expect(can(UserRole.VIEWER, NHQ, 'EXPORT')).toBe(true);
  });

  it('gives the audit log to admins only', () => {
    expect(can(UserRole.ADMIN, STATION, 'AUDIT_VIEW')).toBe(true);
    expect(can(UserRole.ENCODER, STATION, 'AUDIT_VIEW')).toBe(false);
    expect(can(UserRole.VIEWER, NHQ, 'AUDIT_VIEW')).toBe(false);
  });

  it('lets everyone view records in scope', () => {
    expect(can(UserRole.VIEWER, NHQ, 'RECORD_VIEW')).toBe(true);
    expect(can(UserRole.ENCODER, STATION, 'RECORD_VIEW')).toBe(true);
    expect(can(UserRole.ADMIN, REGION, 'RECORD_VIEW')).toBe(true);
  });
});
