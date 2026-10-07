import { useState } from "react";
import DialogComponent from "@/components/common/DialogComponent";
import { BriefcaseBusiness, Plus } from "lucide-react";
import AddPosition from "./addPosition/AddPosition";

const Header = () => {
  const [openAddOffice, setOpenAddOffice] = useState(false);
  const modalOnchange = (isOpen: boolean) => {
    setOpenAddOffice(isOpen);
  };

  return (
    <div className='flex items-center justify-between'>
      <div className='flex items-center gap-3'>
        <div className='flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/50'>
          <BriefcaseBusiness className='h-5 w-5' />
        </div>

        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Positions</h1>
          <p className='text-sm text-muted-foreground'>
            Manage personnel positions and their assignments.
          </p>
        </div>
      </div>

      <DialogComponent
        open={openAddOffice}
        modalOnChange={modalOnchange}
        buttonLabel='Add Position'
        dialogTitle='Add New Position'
        dialogDescription='Create a new position for personnel assignment.'
        icon={<Plus className='mr-2 h-4 w-4' />}
      >
        <AddPosition setOpenAddOffice={setOpenAddOffice} />
      </DialogComponent>
    </div>
  );
};

export default Header;
