import {
  ROLE_LABELS,
  SECTION_LABELS,
  type Section,
  type UserRole,
} from "@/constants/personnel";

// "Encoder · EMS", "Administrator", "Reporting / Read-only · all sections".
export const formatRole = (
  role: string,
  section?: string | null,
  options: { viewerAllSections?: boolean } = {},
) => {
  const label = ROLE_LABELS[role as UserRole] ?? role;

  if (section) {
    return `${label} · ${SECTION_LABELS[section as Section] ?? section}`;
  }

  if (role === "VIEWER" && options.viewerAllSections) {
    return `${label} · all sections`;
  }

  return label;
};
