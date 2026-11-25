import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";

import SideHeader from "./SideHeader/SideHeader";
import SideFooter from "./SideFooter/SideFooter";
import NavGroup from "./NavGroup";
import { useUserStore } from "@/store/userStore";
import { NAV_GROUPS } from "@/constants/links";

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
        {NAV_GROUPS.map(({ label, links }) => {
          const visible = links.filter((link) => link.canAccess(user));

          return (
            visible.length > 0 && (
              <SidebarGroup key={label}>
                <SidebarGroupLabel>{label}</SidebarGroupLabel>
                <NavGroup links={visible} />
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
