import { useState } from "react";
import DialogComponent from "@/components/common/DialogComponent";
import { Shapes, Plus } from "lucide-react";
import AddClassification from "./addClassification/AddClassification";
// import AddPosition from "./addPosition/AddPosition";

const Header = () => {
  const [openAddClassification, setOpenAddClassification] = useState(false);
  const modalOnchange = (isOpen: boolean) => {
    setOpenAddClassification(isOpen);
  };

  return (
    <div className='flex items-center justify-between'>
      <div className='flex items-center gap-3'>
        <div className='flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/50'>
          <Shapes className='h-5 w-5' />
        </div>

        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>
            Incident Classifications
          </h1>
          <p className='text-sm text-muted-foreground'>
            Manage classifications used to categorize fire incidents.
          </p>
        </div>
      </div>

      <DialogComponent
        open={openAddClassification}
        modalOnChange={modalOnchange}
        buttonLabel='Add Classification'
        dialogTitle='Add New Classification'
        dialogDescription='Create a new classification for fire incidents.'
        icon={<Plus className='mr-2 h-4 w-4' />}
      >
        <AddClassification
          setOpenAddClassification={setOpenAddClassification}
        />
      </DialogComponent>
    </div>
  );
};

export default Header;
