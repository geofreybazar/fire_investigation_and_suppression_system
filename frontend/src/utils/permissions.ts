// Mirrors backend/src/common/authz (REQUIREMENTS.md §7.2) to decide which
// links and controls to show. Display only: the backend enforces every rule.

export type Tier = "NHQ" | "REGIONAL" | "DISTRICT_PROVINCE" | "STATION";

const OFFICE_TIER: Record<string, Tier> = {
  NATIONAL_HEADQUARTERS: "NHQ",
  REGIONAL_OFFICE: "REGIONAL",
  DISTRICT_FIRE_STATION: "DISTRICT_PROVINCE",
  PROVINCIAL_FIRE_STATION: "DISTRICT_PROVINCE",
  CITY_FIRE_STATION: "STATION",
  MUNICIPAL_FIRE_STATION: "STATION",
};

export const tierOf = (officeType?: string | null): Tier | undefined =>
  officeType ? OFFICE_TIER[officeType] : undefined;

export type Permission =
  | "REFERENCE_MANAGE"
  | "OFFICE_MANAGE"
  | "POSITION_MANAGE"
  | "USER_MANAGE"
  | "RECORD_WRITE"
  | "RECORD_DELETE"
  | "RECORD_RESTORE"
  | "RECORD_VIEW"
  | "PII_VIEW"
  | "MEDICAL_VIEW"
  | "EXPORT"
  | "EXPORT_PII"
  | "AUDIT_VIEW";

const ALL: Tier[] = ["NHQ", "REGIONAL", "DISTRICT_PROVINCE", "STATION"];

const MATRIX: Record<string, Partial<Record<Permission, Tier[]>>> = {
  SUPER_ADMIN: {
    REFERENCE_MANAGE: ALL,
    OFFICE_MANAGE: ALL,
    POSITION_MANAGE: ALL,
    USER_MANAGE: ALL,
    RECORD_DELETE: ALL,
    RECORD_RESTORE: ALL,
    RECORD_VIEW: ALL,
    PII_VIEW: ALL,
    MEDICAL_VIEW: ALL,
    EXPORT: ALL,
    EXPORT_PII: ALL,
    AUDIT_VIEW: ALL,
  },
  ADMIN: {
    REFERENCE_MANAGE: ["NHQ"],
    OFFICE_MANAGE: ["NHQ", "REGIONAL"],
    POSITION_MANAGE: ["NHQ", "REGIONAL"],
    USER_MANAGE: ALL,
    RECORD_WRITE: ["STATION"],
    RECORD_DELETE: ["STATION"],
    RECORD_VIEW: ALL,
    PII_VIEW: ALL,
    MEDICAL_VIEW: ALL,
    EXPORT: ALL,
    EXPORT_PII: ALL,
    AUDIT_VIEW: ALL,
  },
  ENCODER: {
    RECORD_WRITE: ["STATION"],
    RECORD_VIEW: ["STATION"],
    PII_VIEW: ["STATION"],
    MEDICAL_VIEW: ["STATION"],
    EXPORT: ["STATION"],
  },
  VIEWER: {
    RECORD_VIEW: ALL,
    PII_VIEW: ["STATION"],
    EXPORT: ALL,
  },
};

export interface PermissionUser {
  role: string;
  office?: { type: string } | null;
}

export const hasPermission = (
  user: PermissionUser | null | undefined,
  permission: Permission,
): boolean => {
  const tier = tierOf(user?.office?.type);
  if (!user || !tier) return false;
  return MATRIX[user.role]?.[permission]?.includes(tier) ?? false;
};

export const can =
  (permission: Permission) => (user?: PermissionUser | null) =>
    hasPermission(user, permission);

export const isSuperAdmin = (user?: PermissionUser | null) =>
  user?.role === "SUPER_ADMIN";

// Roles an admin may pick when creating or editing an account. The backend
// also checks the chosen office (common/authz/user-assignment.ts).
export const assignableRoles = (
  user?: PermissionUser | null,
): ("ADMIN" | "ENCODER" | "VIEWER")[] => {
  if (!user) return [];
  if (user.role === "SUPER_ADMIN") return ["ADMIN", "ENCODER", "VIEWER"];
  if (!hasPermission(user, "USER_MANAGE")) return [];
  return tierOf(user.office?.type) === "STATION"
    ? ["ENCODER", "VIEWER"]
    : ["ADMIN", "ENCODER", "VIEWER"];
};

// Section rules for an account (FR-USR-002): required for encoders and for
// viewers at stations, optional for viewers above, none for admins.
export const sectionRule = (
  role?: string,
  officeType?: string,
): "required" | "optional" | "none" => {
  if (role === "ENCODER") return "required";
  if (role === "VIEWER") {
    return tierOf(officeType) === "STATION" ? "required" : "optional";
  }
  return "none";
};
