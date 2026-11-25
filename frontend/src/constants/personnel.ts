export const RANKS = [
  "FDIR",
  "FCSUPT",
  "FSSUPT",
  "FSUPT",
  "FCINSP",
  "FSINSP",
  "FINSP",
  "SFO4",
  "SFO3",
  "SFO2",
  "SFO1",
  "FO3",
  "FO2",
  "FO1",
] as const;

// BFP-CMS roles (REQUIREMENTS.md §7.1). SUPER_ADMIN is never assignable.
export const USER_ROLES = ["SUPER_ADMIN", "ADMIN", "ENCODER", "VIEWER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ASSIGNABLE_ROLES = ["ADMIN", "ENCODER", "VIEWER"] as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "System Super Administrator",
  ADMIN: "Administrator",
  ENCODER: "Encoder",
  VIEWER: "Reporting / Read-only",
};

// The section fixes the response type an encoder records (FR-RT-001).
export const SECTIONS = ["OPERATIONS", "EMS", "SRF"] as const;
export type Section = (typeof SECTIONS)[number];

export const SECTION_LABELS: Record<Section, string> = {
  OPERATIONS: "Operations (Fire)",
  EMS: "EMS",
  SRF: "SRF (Special Rescue)",
};

export type Rank = (typeof RANKS)[number];
