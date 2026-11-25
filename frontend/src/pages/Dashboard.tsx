import { Link } from "react-router";
import { ArrowRight, Hourglass, LayoutDashboard } from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { ALL_LINKS } from "@/constants/links";
import { formatRole } from "@/utils/formatRole";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import { NAV_ICONS } from "@/components/layout/AppSidebar/navIcons";

// Casualty KPIs and trends arrive with the reports phase (REQUIREMENTS.md
// FR-RPT-003); until then the dashboard offers shortcuts to every page the
// role can use.
const Dashboard = () => {
  const user = useUserStore((state) => state.user);

  const shortcuts = ALL_LINKS.filter(
    (link) => link.link !== "/" && link.canAccess(user),
  );

  return (
    <div className='space-y-6'>
      <PageHeader
        icon={<LayoutDashboard />}
        title={`Welcome, ${user?.first_name ?? "back"}`}
        description={
          user
            ? `${formatRole(user.role, user.section)} · ${user.office?.name ?? ""}`
            : undefined
        }
      />

      <EmptyState
        icon={<Hourglass />}
        title='Casualty monitoring is coming'
        description='Incidents, casualty records and the casualty dashboard are being built. Administration is available now.'
      />

      {shortcuts.length > 0 && (
        <>
          <h2 className='text-sm font-medium text-muted-foreground'>Go to</h2>
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
                    {link.description}
                  </p>
                </div>
                <ArrowRight className='mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5' />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
