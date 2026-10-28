import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  TextareaField,
  TextField,
} from "@/components/common/form/FormFields";

// SUPER_ADMIN deletion: both the reason and the reference of the memo
// approved by the Chief, BFP are required (FR-AUD-003).
const deleteSchema = z.object({
  memoReference: z.string().trim().min(1, "This field is required").max(200),
  reason: z.string().trim().min(1, "This field is required").max(1000),
});
export type DeleteIncidentValues = z.infer<typeof deleteSchema>;

interface DeleteIncidentFormProps {
  isPending: boolean;
  onSubmit: (values: DeleteIncidentValues) => Promise<void>;
}

const DeleteIncidentForm = ({ isPending, onSubmit }: DeleteIncidentFormProps) => {
  const methods = useForm<DeleteIncidentValues>({
    resolver: zodResolver(deleteSchema),
    defaultValues: { memoReference: "", reason: "" },
  });

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className='flex flex-col gap-3'
      >
        <TextField<DeleteIncidentValues>
          name='memoReference'
          label='Memo reference'
          placeholder='Memo approved by the Chief, BFP'
        />
        <TextareaField<DeleteIncidentValues>
          name='reason'
          label='Reason'
          placeholder='Why the incident is being deleted'
        />
        <Button type='submit' variant='destructive' disabled={isPending}>
          {isPending ? (
            <>
              <Spinner />
              Saving...
            </>
          ) : (
            "Delete"
          )}
        </Button>
      </form>
    </FormProvider>
  );
};

export default DeleteIncidentForm;
