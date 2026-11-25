import { OfficeType, UserRole } from '../../generated/prisma/enums.js';
import { Tier, tierOf } from './tier.js';

// What each role may do at each tier (REQUIREMENTS.md §7.2). Scope (which
// offices and which section) is checked separately, in the services.
export const Permission = {
  // Incident categories, agencies, injury types.
  REFERENCE_MANAGE: 'REFERENCE_MANAGE',
  OFFICE_MANAGE: 'OFFICE_MANAGE',
  POSITION_MANAGE: 'POSITION_MANAGE',
  USER_MANAGE: 'USER_MANAGE',
  // Create and edit incidents and casualties, including corrections.
  RECORD_WRITE: 'RECORD_WRITE',
  RECORD_DELETE: 'RECORD_DELETE',
  RECORD_RESTORE: 'RECORD_RESTORE',
  RECORD_VIEW: 'RECORD_VIEW',
  // Casualty names, address and contact.
  PII_VIEW: 'PII_VIEW',
  // Injury and death details.
  MEDICAL_VIEW: 'MEDICAL_VIEW',
  EXPORT: 'EXPORT',
  EXPORT_PII: 'EXPORT_PII',
  AUDIT_VIEW: 'AUDIT_VIEW',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

const ALL_TIERS: Tier[] = ['NHQ', 'REGIONAL', 'DISTRICT_PROVINCE', 'STATION'];

// Role → permission → tiers at which the role holds it.
const MATRIX: Record<UserRole, Partial<Record<Permission, Tier[]>>> = {
  [UserRole.SUPER_ADMIN]: {
    REFERENCE_MANAGE: ALL_TIERS,
    OFFICE_MANAGE: ALL_TIERS,
    POSITION_MANAGE: ALL_TIERS,
    USER_MANAGE: ALL_TIERS,
    RECORD_DELETE: ALL_TIERS,
    RECORD_RESTORE: ALL_TIERS,
    RECORD_VIEW: ALL_TIERS,
    PII_VIEW: ALL_TIERS,
    MEDICAL_VIEW: ALL_TIERS,
    EXPORT: ALL_TIERS,
    EXPORT_PII: ALL_TIERS,
    AUDIT_VIEW: ALL_TIERS,
  },
  [UserRole.ADMIN]: {
    REFERENCE_MANAGE: ['NHQ'],
    OFFICE_MANAGE: ['NHQ', 'REGIONAL'],
    POSITION_MANAGE: ['NHQ', 'REGIONAL'],
    USER_MANAGE: ALL_TIERS,
    RECORD_WRITE: ['STATION'],
    RECORD_DELETE: ['STATION'],
    RECORD_VIEW: ALL_TIERS,
    PII_VIEW: ALL_TIERS,
    MEDICAL_VIEW: ALL_TIERS,
    EXPORT: ALL_TIERS,
    EXPORT_PII: ALL_TIERS,
    AUDIT_VIEW: ALL_TIERS,
  },
  [UserRole.ENCODER]: {
    RECORD_WRITE: ['STATION'],
    RECORD_VIEW: ['STATION'],
    PII_VIEW: ['STATION'],
    MEDICAL_VIEW: ['STATION'],
    EXPORT: ['STATION'],
  },
  [UserRole.VIEWER]: {
    RECORD_VIEW: ALL_TIERS,
    // Above station level, viewers see personal information masked.
    PII_VIEW: ['STATION'],
    EXPORT: ALL_TIERS,
  },
};

export function hasPermission(
  user: { role: UserRole; officeType: OfficeType },
  permission: Permission,
): boolean {
  const tiers = MATRIX[user.role][permission];
  return tiers?.includes(tierOf(user.officeType)) ?? false;
}
