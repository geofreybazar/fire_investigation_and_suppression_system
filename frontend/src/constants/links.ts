import { can } from "@/utils/permissions";

// `canAccess` only decides what the sidebar shows and which pages render; the
// backend enforces every permission (REQUIREMENTS.md §7.2).

interface LinkUser {
  role: string;
  office?: { type: string } | null;
}

export interface NavLinkItem {
  link: string;
  label: string;
  icon: string;
  // What the page is for, shown on its dashboard shortcut.
  description: string;
  canAccess: (user?: LinkUser | null) => boolean;
}

export interface NavGroup {
  label: string;
  links: NavLinkItem[];
}

const everyone = (user?: LinkUser | null) => !!user;

// Incident, casualty and report pages join in roadmap phases 2–4
// (REQUIREMENTS.md §13).
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    links: [
      {
        link: "/",
        label: "Dashboard",
        icon: "Dashboard",
        description: "Your overview.",
        canAccess: everyone,
      },
    ],
  },
  {
    label: "Administration",
    links: [
      {
        link: "/personnel",
        label: "Personnel",
        icon: "Users",
        description: "Manage accounts, roles and sections.",
        canAccess: can("USER_MANAGE"),
      },
      {
        link: "/positions",
        label: "Positions",
        icon: "BriefcaseBusiness",
        description: "Manage the list of positions.",
        canAccess: can("POSITION_MANAGE"),
      },
      {
        link: "/offices",
        label: "Offices",
        icon: "Building",
        description: "Manage offices and their hierarchy.",
        canAccess: can("OFFICE_MANAGE"),
      },
      {
        link: "/auditlog",
        label: "Audit Log",
        icon: "History",
        description: "See who changed what, and when.",
        canAccess: can("AUDIT_VIEW"),
      },
    ],
  },
];

export const ALL_LINKS: NavLinkItem[] = NAV_GROUPS.flatMap(
  (group) => group.links,
);
