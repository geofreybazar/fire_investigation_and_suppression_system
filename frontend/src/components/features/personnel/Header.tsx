import { useState } from "react";
import DialogComponent from "@/components/common/DialogComponent";
import { Users, Plus } from "lucide-react";
import AddPersonnel from "./addPersonnel/AddPersonnel";

const Header = () => {
  const [openAddPersonnel, setOpenAddPersonnel] = useState(false);

  return (
    <div className='flex items-center justify-between'>
      <div className='flex items-center gap-3'>
        <div className='flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/50'>
          <Users className='h-5 w-5' />
        </div>

        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Personnel</h1>
          <p className='text-sm text-muted-foreground'>
            Manage personnel accounts and organizational assignments.
          </p>
        </div>
      </div>

      <DialogComponent
        open={openAddPersonnel}
        modalOnChange={setOpenAddPersonnel}
        buttonLabel='Add Personnel'
        dialogTitle='Add New Personnel'
        dialogDescription='Enter the personnel details and assign their office.'
        icon={<Plus className='mr-2 h-4 w-4' />}
        classname='max-h-[90vh] overflow-y-auto md:max-w-2xl'
      >
        <AddPersonnel setOpenAddPersonnel={setOpenAddPersonnel} />
      </DialogComponent>
    </div>
  );
};

export default Header;
