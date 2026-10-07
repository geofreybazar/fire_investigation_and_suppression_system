import { NavLink } from "react-router";
import { Users, Building, BriefcaseBusiness, Shapes } from "lucide-react";

import {
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ADMINISTRATION_LINKS } from "@/constants/links";

const iconMap: Record<string, React.ReactNode> = {
  Users: <Users />,
  Building: <Building />,
  BriefcaseBusiness: <BriefcaseBusiness />,
  Shapes: <Shapes />,
};

const Administration = () => {
  const { toggleSidebar, isMobile } = useSidebar();

  return (
    <SidebarGroupContent>
      <SidebarMenu>
        {ADMINISTRATION_LINKS.map((link) => (
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
