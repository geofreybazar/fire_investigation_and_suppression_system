import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import {
  timelineEntrySchema,
  type TimelineEntryPayload,
} from "@/interface/fireIncident/fireIncident";
import {
  ALARM_LEVELS,
  FIRE_INCIDENT_STATUSES,
  type FireAlarmLevel,
  type FireIncidentStatus,
} from "@/constants/fireIncident";
import { enumOptions } from "@/utils/formatEnum";
import { fromLocalInput, nowLocalInput, toLocalInput } from "@/utils/dateTime";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  SelectField,
  TextField,
  TextareaField,
} from "@/components/common/form/FormFields";

const alarmOptions = [
  { value: "", label: "Keep the alarm in effect at that time" },
  { value: "NONE", label: "No alarm raised" },
  ...enumOptions(ALARM_LEVELS),
];

const entrySchema = timelineEntrySchema.extend({
  reason: z.string().optional(),
});

// A correction also needs a reason.
const correctionSchema = entrySchema.refine((values) => !!values.reason?.trim(), {
  message: "Give a reason for the correction",
  path: ["reason"],
});

type Values = z.infer<typeof entrySchema>;

interface TimelineEntryFormProps {
  initial?: {
    status: FireIncidentStatus;
    alarmLevel: FireAlarmLevel | null;
    occurredAt: string;
    remarks: string | null;
  };
  withReason?: boolean;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (entry: TimelineEntryPayload, reason?: string) => Promise<void>;
}

const TimelineEntryForm = ({
  initial,
  withReason = false,
  submitLabel,
  isPending,
  onSubmit,
}: TimelineEntryFormProps) => {
  const methods = useForm<Values>({
    resolver: zodResolver(withReason ? correctionSchema : entrySchema),
    defaultValues: {
      status: initial?.status ?? "ON_GOING",
      alarmLevel: initial ? (initial.alarmLevel ?? "NONE") : "",
      occurredAt: initial ? toLocalInput(initial.occurredAt) : nowLocalInput(),
      remarks: initial?.remarks ?? "",
      reason: "",
    },
  });

  const submit = (values: Values) =>
    onSubmit(
      {
        status: values.status,
        // Omitting the alarm keeps the one in effect at that time.
        ...(values.alarmLevel !== "" && {
          alarmLevel: values.alarmLevel === "NONE" ? null : values.alarmLevel,
        }),
        occurredAt: fromLocalInput(values.occurredAt) as string,
        ...(values.remarks && { remarks: values.remarks }),
      },
      withReason ? values.reason : undefined,
    );

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(submit)}
        className='flex flex-col gap-3'
      >
        <SelectField<Values>
          name='status'
          label='Status'
          options={enumOptions(FIRE_INCIDENT_STATUSES)}
        />
        <SelectField<Values>
          name='alarmLevel'
          label='Alarm level'
          options={alarmOptions}
        />
        <TextField<Values>
          name='occurredAt'
          label='When it happened'
          type='datetime-local'
        />
        <TextareaField<Values> name='remarks' label='Remarks (optional)' />
        {withReason && (
          <TextareaField<Values> name='reason' label='Reason for correction' />
        )}
        <p className='text-xs text-muted-foreground'>
          The server checks the change against the incident's status rules and
          the alarm level, which can only go up.
        </p>
        <Button type='submit' disabled={isPending}>
          {isPending ? (
            <>
              <Spinner />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </form>
    </FormProvider>
  );
};

export default TimelineEntryForm;
