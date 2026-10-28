import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";

import SideHeader from "./SideHeader/SideHeader";
import Overview from "./Overview/Overview";
import FireOperations from "./FireOperations/FireOperations";
import Investigation from "./Investigation/Investigation";
import Reports from "./Reports/Reports";
import Administration from "./Administration/Administration";
import SideFooter from "./SideFooter/SideFooter";
import { useUserStore } from "@/store/userStore";
import {
  ADMINISTRATION_LINKS,
  FIRE_OPERATIONS_LINKS,
  INVESTIGATION_LINKS,
  OVERVIEW_LINKS,
  REPORTS_LINKS,
  type NavLinkItem,
} from "@/constants/links";

const GROUPS: {
  label: string;
  links: NavLinkItem[];
  Component: (props: { links: NavLinkItem[] }) => React.ReactNode;
}[] = [
  { label: "Overview", links: OVERVIEW_LINKS, Component: Overview },
  {
    label: "Fire Operations",
    links: FIRE_OPERATIONS_LINKS,
    Component: FireOperations,
  },
  {
    label: "Investigation",
    links: INVESTIGATION_LINKS,
    Component: Investigation,
  },
  { label: "Reports & Analytics", links: REPORTS_LINKS, Component: Reports },
  {
    label: "Administration",
    links: ADMINISTRATION_LINKS,
    Component: Administration,
  },
];

const AppSidebar = () => {
  const user = useUserStore((state) => state.user);

  return (
    <Sidebar collapsible='icon'>
      {/* HEADER */}
      <SidebarHeader>
        <SideHeader />
      </SidebarHeader>

      <SidebarContent>
        {/* Only the links this role can use; empty groups are left out. */}
        {GROUPS.map(({ label, links, Component }) => {
          const visible = links.filter((link) => link.canAccess(user));

          return (
            visible.length > 0 && (
              <SidebarGroup key={label}>
                <SidebarGroupLabel>{label}</SidebarGroupLabel>
                <Component links={visible} />
              </SidebarGroup>
            )
          );
        })}
      </SidebarContent>

      {/* FOOTER */}
      <SidebarFooter>
        <SideFooter />
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
