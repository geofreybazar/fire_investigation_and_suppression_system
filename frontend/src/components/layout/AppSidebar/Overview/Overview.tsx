import { NavLink } from "react-router";
import {
  useSidebar,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

import { Flame, LayoutDashboard, Map } from "lucide-react";
import { OVERVIEW_LINKS } from "@/constants/links";

const iconMap: Record<string, React.ReactNode> = {
  Dashboard: <LayoutDashboard />,
  Map: <Map />,
  Flame: <Flame />,
};

const Overview = () => {
  const { toggleSidebar, isMobile } = useSidebar();
  return (
    <SidebarGroupContent>
      <SidebarMenu>
        {OVERVIEW_LINKS.map((link) => (
          <NavLink to={link.link} key={link.link}>
            {({ isActive }) => (
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isActive}
                  className='cursor-pointer'
                  onClick={() => {
                    if (isMobile) {
                      toggleSidebar();
                    }
                  }}
                >
                  {iconMap[link.icon]} {link.label}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </NavLink>
        ))}
      </SidebarMenu>
    </SidebarGroupContent>
  );
};

export default Overview;
