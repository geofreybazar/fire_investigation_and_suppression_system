import { useNavigate } from "react-router";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useSubmitFireIncident from "@/hooks/fireIncidents/useSubmitFireIncident";
import {
  submitIncidentSchema,
  type SubmitIncidentFormValues,
} from "@/interface/fireIncident/fireIncident";
import { ALARM_LEVELS, INITIAL_STATUSES } from "@/constants/fireIncident";
import { enumOptions } from "@/utils/formatEnum";
import { fromLocalInput, nowLocalInput } from "@/utils/dateTime";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import {
  NumberField,
  SelectField,
  TextField,
  TextareaField,
} from "@/components/common/form/FormFields";
import CategoryFields from "./CategoryFields";

const alarmOptions = [
  { value: "NONE", label: "No alarm raised" },
  ...enumOptions(ALARM_LEVELS),
];

const SubmitIncidentForm = ({ onDone }: { onDone: () => void }) => {
  const navigate = useNavigate();
  const { submitFireIncident, isPending } = useSubmitFireIncident();

  const methods = useForm<SubmitIncidentFormValues>({
    resolver: zodResolver(submitIncidentSchema),
    defaultValues: {
      categoryId: "",
      placeOfOccurence: "",
      barangay: "",
      latitude: null,
      longitude: null,
      initialStatus: "VERIFICATION",
      initialAlarmLevel: "NONE",
      occurredAt: nowLocalInput(),
    },
  });

  const onSubmit = async (values: SubmitIncidentFormValues) => {
    try {
      const incident = await submitFireIncident({
        categoryId: values.categoryId,
        subcategoryId: values.subcategoryId || null,
        dateTimeReported: fromLocalInput(values.dateTimeReported),
        dateTimeFireIncident: fromLocalInput(values.dateTimeFireIncident),
        dateTimeCallReceived: fromLocalInput(values.dateTimeCallReceived),
        remarks: values.remarks || null,
        location: {
          placeOfOccurence: values.placeOfOccurence,
          barangay: values.barangay,
          latitude: values.latitude ?? null,
          longitude: values.longitude ?? null,
        },
        initialEntry: {
          status: values.initialStatus,
          alarmLevel:
            values.initialAlarmLevel === "NONE" ? null : values.initialAlarmLevel,
          occurredAt: fromLocalInput(values.occurredAt) as string,
        },
      });
      onDone();
      navigate(`/fireincidents/${incident.id}`);
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
        <CategoryFields />

        <Separator />
        <p className='text-sm font-medium'>Location</p>
        <p className='-mt-3 text-xs text-muted-foreground'>
          Region, province/district and city/municipality are taken from your
          station.
        </p>
        <TextField<SubmitIncidentFormValues>
          name='placeOfOccurence'
          label='Place of occurrence'
          placeholder='Street, building or landmark'
        />
        <TextField<SubmitIncidentFormValues>
          name='barangay'
          label='Barangay'
        />
        <div className='grid gap-3 sm:grid-cols-2'>
          <NumberField<SubmitIncidentFormValues>
            name='latitude'
            label='Latitude (optional)'
          />
          <NumberField<SubmitIncidentFormValues>
            name='longitude'
            label='Longitude (optional)'
          />
        </div>

        <Separator />
        <p className='text-sm font-medium'>First status</p>
        <div className='grid gap-3 sm:grid-cols-2'>
          <SelectField<SubmitIncidentFormValues>
            name='initialStatus'
            label='Status'
            options={enumOptions(INITIAL_STATUSES)}
          />
          <SelectField<SubmitIncidentFormValues>
            name='initialAlarmLevel'
            label='Alarm level'
            options={alarmOptions}
          />
        </div>
        <TextField<SubmitIncidentFormValues>
          name='occurredAt'
          label='Time of this status'
          type='datetime-local'
        />

        <Separator />
        <p className='text-sm font-medium'>Dates (optional, can be added later)</p>
        <div className='grid gap-3 sm:grid-cols-3'>
          <TextField<SubmitIncidentFormValues>
            name='dateTimeFireIncident'
            label='Fire incident'
            type='datetime-local'
          />
          <TextField<SubmitIncidentFormValues>
            name='dateTimeCallReceived'
            label='Call received'
            type='datetime-local'
          />
          <TextField<SubmitIncidentFormValues>
            name='dateTimeReported'
            label='Reported'
            type='datetime-local'
          />
        </div>

        <TextareaField<SubmitIncidentFormValues>
          name='remarks'
          label='Remarks (optional)'
        />

        <Button type='submit' disabled={isPending}>
          {isPending ? (
            <>
              <Spinner />
              Submitting...
            </>
          ) : (
            "Submit for approval"
          )}
        </Button>
      </form>
    </FormProvider>
  );
};

export default SubmitIncidentForm;
