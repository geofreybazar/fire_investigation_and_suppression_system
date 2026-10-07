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

const AppSidebar = () => {
  return (
    <Sidebar collapsible='icon'>
      {/* HEADER */}
      <SidebarHeader>
        <SideHeader />
      </SidebarHeader>

      <SidebarContent>
        {/* OVERVIEW */}
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <Overview />
        </SidebarGroup>

        {/* FIRE OPERATIONS */}
        <SidebarGroup>
          <SidebarGroupLabel>Fire Operations</SidebarGroupLabel>
          <FireOperations />
        </SidebarGroup>

        {/* INVESTIGATION */}
        <SidebarGroup>
          <SidebarGroupLabel>Investigation</SidebarGroupLabel>
          <Investigation />
        </SidebarGroup>

        {/* REPORTS */}
        <SidebarGroup>
          <SidebarGroupLabel>Reports & Analytics</SidebarGroupLabel>
          <Reports />
        </SidebarGroup>

        {/* ADMINISTRATION */}
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <Administration />
        </SidebarGroup>
      </SidebarContent>

      {/* FOOTER */}
      <SidebarFooter>
        <SideFooter />
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
