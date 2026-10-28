import {
  CHIEF_INVESTIGATOR_ROLES,
  INCIDENT_EDITOR_ROLES,
  INVESTIGATOR_ROLES,
  NO_INCIDENT_ACCESS_ROLES,
  STATION_CHIEF_ROLE,
} from "@/constants/fireIncident";

// Which controls to show. The backend enforces every one of these rules;
// hiding a button is never the access check.

interface CurrentUser {
  id: string;
  role: string;
  officeId: string;
}

interface OwnedIncident {
  officeId: string;
}

export const isSuperAdmin = (user?: CurrentUser | null) =>
  user?.role === "SUPER_ADMIN";

export const canViewIncidents = (user?: CurrentUser | null) =>
  !!user && !NO_INCIDENT_ACCESS_ROLES.includes(user.role);

export const isIncidentEditor = (user?: CurrentUser | null) =>
  !!user && INCIDENT_EDITOR_ROLES.includes(user.role);

export const canEditIncident = (
  user: CurrentUser | null | undefined,
  incident: OwnedIncident,
) => isIncidentEditor(user) && user?.officeId === incident.officeId;

export const isStationChiefOf = (
  user: CurrentUser | null | undefined,
  incident: OwnedIncident,
) => user?.role === STATION_CHIEF_ROLE && user.officeId === incident.officeId;

export const isChiefInvestigator = (user?: CurrentUser | null) =>
  !!user && CHIEF_INVESTIGATOR_ROLES.includes(user.role);

export const isInvestigator = (user?: CurrentUser | null) =>
  !!user && INVESTIGATOR_ROLES.includes(user.role);

// Mirrors @Roles on the users, offices and positions controllers.
const ADMIN_ROLES = ["SUPER_ADMIN", "NHQ_ADMIN", "REGIONAL_ADMIN"];

// Mirrors @Roles on the categories controller for writes.
const CLASSIFICATION_MANAGER_ROLES = [
  "SUPER_ADMIN",
  "NHQ_ADMIN",
  "NHQ_CHIEF_INVESTIGATOR",
  "NHQ_INVESTIGATOR",
  "NHQ_OPERATION",
  "NHQ_OPERATION_STAFF",
];

export const isAdmin = (user?: CurrentUser | null) =>
  !!user && ADMIN_ROLES.includes(user.role);

export const canManageClassifications = (user?: CurrentUser | null) =>
  !!user && CLASSIFICATION_MANAGER_ROLES.includes(user.role);
