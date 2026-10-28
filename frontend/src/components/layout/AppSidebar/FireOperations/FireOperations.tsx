import { NavLink } from "react-router";
import {
  useSidebar,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import type { NavLinkItem } from "@/constants/links";
import { Radio, Truck, Building2 } from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  Building2: <Building2 />,
  Radio: <Radio />,
  Truck: <Truck />,
};

const FireOperations = ({ links }: { links: NavLinkItem[] }) => {
  const { toggleSidebar, isMobile } = useSidebar();
  return (
    <SidebarGroupContent>
      <SidebarMenu>
        {links.map((link) => (
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

export default FireOperations;
