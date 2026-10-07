import { useState } from "react";
import DialogComponent from "@/components/common/DialogComponent";
import { Building2, Plus } from "lucide-react";
import AddOffice from "./addOffice/AddOffice";

const Header = () => {
  const [openAddOffice, setOpenAddOffice] = useState(false);
  const modalOnchange = (isOpen: boolean) => {
    setOpenAddOffice(isOpen);
  };

  return (
    <div className='flex items-center justify-between'>
      <div className='flex items-center gap-3'>
        <div className='flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/50'>
          <Building2 className='h-5 w-5' />
        </div>

        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Offices</h1>
          <p className='text-sm text-muted-foreground'>
            Manage organizational offices and their hierarchy.
          </p>
        </div>
      </div>

      <DialogComponent
        open={openAddOffice}
        modalOnChange={modalOnchange}
        buttonLabel='Add Office'
        dialogTitle='Add New Office'
        dialogDescription='Create a new office and assign it to the appropriate office hierarchy.'
        icon={<Plus className='mr-2 h-4 w-4' />}
      >
        <AddOffice setOpenAddOffice={setOpenAddOffice} />
      </DialogComponent>
    </div>
  );
};

export default Header;
