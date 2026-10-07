import { NavLink } from "react-router";

import { FileText, BarChart3 } from "lucide-react";
import { REPORTS_LINKS } from "@/constants/links";

import {
  useSidebar,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const iconMap: Record<string, React.ReactNode> = {
  FileText: <FileText />,
  BarChart3: <BarChart3 />,
};

const Reports = () => {
  const { toggleSidebar, isMobile } = useSidebar();

  return (
    <SidebarGroupContent>
      <SidebarMenu>
        {REPORTS_LINKS.map((link) => (
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

export default Reports;
