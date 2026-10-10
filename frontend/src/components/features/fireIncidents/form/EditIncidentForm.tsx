import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useUpdateFireIncident from "@/hooks/fireIncidents/useUpdateFireIncident";
import {
  editIncidentSchema,
  type EditIncidentFormValues,
  type FireIncidentDetail,
} from "@/interface/fireIncident/fireIncident";
import { fromLocalInput, toLocalInput } from "@/utils/dateTime";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import {
  NumberField,
  TextField,
  TextareaField,
} from "@/components/common/form/FormFields";
import CategoryFields from "./CategoryFields";

const toNumber = (value?: string | null) =>
  value === null || value === undefined ? null : Number(value);

const EditIncidentForm = ({
  incident,
  onDone,
}: {
  incident: FireIncidentDetail;
  onDone: () => void;
}) => {
  const { updateFireIncident, isPending } = useUpdateFireIncident();

  const methods = useForm<EditIncidentFormValues>({
    resolver: zodResolver(editIncidentSchema),
    defaultValues: {
      categoryId: incident.categoryId,
      subcategoryId: incident.subcategoryId ?? undefined,
      placeOfOccurence: incident.location.placeOfOccurence,
      barangay: incident.location.barangay,
      latitude: toNumber(incident.location.latitude),
      longitude: toNumber(incident.location.longitude),
      dateTimeReported: toLocalInput(incident.dateTimeReported),
      dateTimeFireIncident: toLocalInput(incident.dateTimeFireIncident),
      dateTimeCallReceived: toLocalInput(incident.dateTimeCallReceived),
      dateTimeUnresponded: toLocalInput(incident.dateTimeUnresponded),
      remarks: incident.remarks ?? "",
    },
  });

  const onSubmit = async (values: EditIncidentFormValues) => {
    try {
      await updateFireIncident({
        id: incident.id,
        data: {
          categoryId: values.categoryId,
          subcategoryId: values.subcategoryId || null,
          dateTimeReported: fromLocalInput(values.dateTimeReported),
          dateTimeFireIncident: fromLocalInput(values.dateTimeFireIncident),
          dateTimeCallReceived: fromLocalInput(values.dateTimeCallReceived),
          dateTimeUnresponded: fromLocalInput(values.dateTimeUnresponded),
          remarks: values.remarks || null,
          location: {
            placeOfOccurence: values.placeOfOccurence,
            barangay: values.barangay,
            latitude: values.latitude ?? null,
            longitude: values.longitude ?? null,
          },
        },
      });
      onDone();
    } catch {
      // The hook already showed the error; keep the form open to fix it.
    }
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className='flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1'
      >
        <CategoryFields
          current={{
            category: { value: incident.category.id, label: incident.category.name },
            subcategory: incident.subcategory
              ? { value: incident.subcategory.id, label: incident.subcategory.name }
              : undefined,
          }}
        />

        <Separator />
        <TextField<EditIncidentFormValues>
          name='placeOfOccurence'
          label='Place of occurrence'
        />
        <TextField<EditIncidentFormValues> name='barangay' label='Barangay' />
        <div className='grid gap-3 sm:grid-cols-2'>
          <NumberField<EditIncidentFormValues>
            name='latitude'
            label='Latitude (optional)'
          />
          <NumberField<EditIncidentFormValues>
            name='longitude'
            label='Longitude (optional)'
          />
        </div>

        <Separator />
        <div className='grid gap-3 sm:grid-cols-2'>
          <TextField<EditIncidentFormValues>
            name='dateTimeFireIncident'
            label='Fire incident'
            type='datetime-local'
          />
          <TextField<EditIncidentFormValues>
            name='dateTimeCallReceived'
            label='Call received'
            type='datetime-local'
          />
          <TextField<EditIncidentFormValues>
            name='dateTimeReported'
            label='Reported'
            type='datetime-local'
          />
          <TextField<EditIncidentFormValues>
            name='dateTimeUnresponded'
            label='Unresponded'
            type='datetime-local'
          />
        </div>

        <TextareaField<EditIncidentFormValues> name='remarks' label='Remarks' />

        <Button type='submit' disabled={isPending}>
          {isPending ? (
            <>
              <Spinner />
              Saving...
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </form>
    </FormProvider>
  );
};

export default EditIncidentForm;
