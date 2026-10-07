import { SidebarTrigger } from "@/components/ui/sidebar";
import ModeToggle from "../ModeToggle/ModeToggle";
import CurrentDateTime from "./CurrentDateTime";

const Navbar = () => {
  return (
    <div className='w-full flex items-center justify-between p-2 sticky top-0 z-50 bg-sidebar '>
      <SidebarTrigger />
      <CurrentDateTime />
      <ModeToggle />
    </div>
  );
};

export default Navbar;
