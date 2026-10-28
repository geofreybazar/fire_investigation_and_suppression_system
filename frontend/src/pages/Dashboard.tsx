import { Link } from "react-router";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { useUserStore } from "@/store/userStore";
import {
  ADMINISTRATION_LINKS,
  INVESTIGATION_LINKS,
  OVERVIEW_LINKS,
  REPORTS_LINKS,
} from "@/constants/links";
import { formatRole } from "@/utils/formatRole";
import PageHeader from "@/components/common/PageHeader";
import { NAV_ICONS } from "@/components/layout/AppSidebar/navIcons";

// What each page is for, shown on its shortcut card.
const DESCRIPTIONS: Record<string, string> = {
  "/fireincidents": "Record, approve and follow fire incidents.",
  "/investigations": "Your case queue and assigned investigations.",
  "/personnel": "Manage personnel accounts and assignments.",
  "/positions": "Manage the list of positions.",
  "/offices": "Manage offices and their hierarchy.",
  "/incidentclassifications": "Manage incident categories and subcategories.",
  "/auditlog": "See who changed what, and when.",
};

// A welcome page with shortcuts until the statistics dashboard is built
// (roadmap phase 4).
const Dashboard = () => {
  const user = useUserStore((state) => state.user);

  const shortcuts = [
    ...OVERVIEW_LINKS,
    ...INVESTIGATION_LINKS,
    ...REPORTS_LINKS,
    ...ADMINISTRATION_LINKS,
  ].filter(
    (link) => link.link !== "/" && !link.comingSoon && link.canAccess(user),
  );

  return (
    <div className='space-y-6'>
      <PageHeader
        icon={<LayoutDashboard />}
        title={`Welcome, ${user?.first_name ?? "back"}`}
        description={user ? formatRole(user.role) : undefined}
      />

      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
        {shortcuts.map((link) => (
          <Link
            key={link.link}
            to={link.link}
            className='group flex items-start gap-4 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring'
          >
            <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-5'>
              {NAV_ICONS[link.icon]}
            </div>
            <div className='min-w-0 flex-1'>
              <p className='font-medium'>{link.label}</p>
              <p className='text-sm text-muted-foreground'>
                {DESCRIPTIONS[link.link]}
              </p>
            </div>
            <ArrowRight className='mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5' />
          </Link>
        ))}
      </div>

      <p className='text-sm text-muted-foreground'>
        Incident statistics, the incident map and reports are coming soon.
      </p>
    </div>
  );
};

export default Dashboard;
