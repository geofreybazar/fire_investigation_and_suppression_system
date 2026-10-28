import { NavLink } from "react-router";
import {
  Users,
  Building,
  BriefcaseBusiness,
  Shapes,
  History,
} from "lucide-react";

import {
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { NavLinkItem } from "@/constants/links";

const iconMap: Record<string, React.ReactNode> = {
  Users: <Users />,
  Building: <Building />,
  BriefcaseBusiness: <BriefcaseBusiness />,
  Shapes: <Shapes />,
  History: <History />,
};

const Administration = ({ links }: { links: NavLinkItem[] }) => {
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

export default Administration;
