import { NavLink } from "react-router";
import { Search, Shield } from "lucide-react";

import {
  useSidebar,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { INVESTIGATION_LINKS } from "@/constants/links";

const iconMap: Record<string, React.ReactNode> = {
  Search: <Search />,
  Shield: <Shield />,
};

const Investigation = () => {
  const { toggleSidebar, isMobile } = useSidebar();

  return (
    <SidebarGroupContent>
      <SidebarMenu>
        {INVESTIGATION_LINKS.map((link) => (
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

export default Investigation;
