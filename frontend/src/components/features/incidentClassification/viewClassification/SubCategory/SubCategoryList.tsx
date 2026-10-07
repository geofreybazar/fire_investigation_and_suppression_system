import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import type { FireIncidentSubCategory } from "@/interface/incidentSubClassification/incidentSubClassification";

const SubCategoryList = ({
  subcategory,
}: {
  subcategory: FireIncidentSubCategory;
}) => {
  return (
    <div
      key={subcategory.id}
      className='flex items-center gap-3 rounded-lg border p-2'
    >
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-2'>
          <p className='font-medium'>{subcategory.name}</p>
        </div>
      </div>

      <Button variant='ghost' size='icon-sm'>
        <MoreHorizontal className='size-4' />
      </Button>
    </div>
  );
};

export default SubCategoryList;
