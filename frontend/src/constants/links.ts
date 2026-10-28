import {
  canManageClassifications,
  canViewIncidents,
  isAdmin,
} from "@/utils/incidentPermissions";

// `canAccess` only decides what the sidebar shows and which pages render; the
// backend enforces every permission.

interface LinkUser {
  id: string;
  role: string;
  officeId: string;
}

export interface NavLinkItem {
  link: string;
  label: string;
  icon: string;
  canAccess: (user?: LinkUser | null) => boolean;
  // Planned but not built yet: shown with a "Soon" tag.
  comingSoon?: boolean;
}

const everyone = (user?: LinkUser | null) => !!user;

export const OVERVIEW_LINKS: NavLinkItem[] = [
  {
    link: "/",
    label: "Dashboard",
    icon: "Dashboard",
    canAccess: everyone,
  },
  {
    link: "/incidentmap",
    label: "Incident Map",
    icon: "Map",
    canAccess: canViewIncidents,
    comingSoon: true,
  },
  {
    link: "/fireincidents",
    label: "Fire Incidents",
    icon: "Flame",
    canAccess: canViewIncidents,
  },
];

// Hidden until these pages are scoped (REQUIREMENTS.md Q-01).
export const FIRE_OPERATIONS_LINKS: NavLinkItem[] = [
  {
    link: "/firestations",
    label: "Fire Stations",
    icon: "Building2",
    canAccess: () => false,
  },
  {
    link: "/monitoring",
    label: "Monitoring",
    icon: "Radio",
    canAccess: () => false,
  },
  {
    link: "/responseunits",
    label: "Response Units",
    icon: "Truck",
    canAccess: () => false,
  },
];

export const INVESTIGATION_LINKS: NavLinkItem[] = [
  {
    link: "/investigations",
    label: "Investigations",
    icon: "Search",
    canAccess: canViewIncidents,
  },

  {
    link: "/evidence",
    label: "Evidence",
    icon: "Shield",
    canAccess: canViewIncidents,
    comingSoon: true,
  },
];

export const REPORTS_LINKS: NavLinkItem[] = [
  {
    link: "/incidentreports",
    label: "Incident Reports",
    icon: "FileText",
    canAccess: canViewIncidents,
    comingSoon: true,
  },

  {
    link: "/statistics",
    label: "Statistics & Analytics",
    icon: "BarChart3",
    canAccess: canViewIncidents,
    comingSoon: true,
  },
];

export const ADMINISTRATION_LINKS: NavLinkItem[] = [
  {
    link: "/personnel",
    label: "Personnel",
    icon: "Users",
    canAccess: isAdmin,
  },
  {
    link: "/positions",
    label: "Positions",
    icon: "BriefcaseBusiness",
    canAccess: isAdmin,
  },
  {
    link: "/offices",
    label: "Offices",
    icon: "Building",
    canAccess: isAdmin,
  },
  {
    link: "/incidentclassifications",
    label: "Incident Classifications",
    icon: "Shapes",
    canAccess: canManageClassifications,
  },
  {
    link: "/auditlog",
    label: "Audit Log",
    icon: "History",
    canAccess: isAdmin,
  },
];
