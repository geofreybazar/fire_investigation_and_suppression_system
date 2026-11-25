import type { ComponentProps } from "react";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import type { User } from "@/interface/users/users";
import { formatRole } from "@/utils/formatRole";

type TriggerProps = {
  user: User;
} & ComponentProps<typeof SidebarMenuButton>;

const Trigger = ({ user, ...props }: TriggerProps) => {
  const userName = `${user.rank} ${user.first_name} ${user.middle_name && user.middle_name[0]}  ${user.last_name}`;
  const nameInitial = `${user.first_name[0]}${user.last_name[0]}`;

  return (
    <SidebarMenuButton {...props} className='h-auto cursor-pointer'>
      <div className='flex aspect-square size-8 items-center justify-center rounded-full bg-muted uppercase'>
        {nameInitial}
      </div>

      <div className='grid flex-1 text-left text-sm leading-tight'>
        <span className='truncate font-semibold'>{userName}</span>
        <span className='text-xs text-muted-foreground'>
          {user.office.name}
        </span>

        <span className='truncate text-xs text-muted-foreground'>
          {formatRole(user.role, user.section)}
        </span>
      </div>
    </SidebarMenuButton>
  );
};

export default Trigger;
