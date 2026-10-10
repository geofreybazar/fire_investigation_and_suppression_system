import { useState } from "react";
import { Pencil } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { useUserStore } from "@/store/userStore";
import useUpdateFireIncident from "@/hooks/fireIncidents/useUpdateFireIncident";
import type { FireIncidentDetail } from "@/interface/fireIncident/fireIncident";
import { canEditIncident } from "@/utils/incidentPermissions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NoButtonDialogComponent from "@/components/common/NoButtonDialogComponent";
import { NumberField, TextField } from "@/components/common/form/FormFields";

// Casualties and damage, responding resources, and responding personnel.

const IMPACT_FIELDS = [
  ["fatalitiesCiv", "Civilian fatalities"],
  ["injuredCiv", "Civilians injured"],
  ["fatalitiesBFP", "BFP fatalities"],
  ["injuredBFP", "BFP injured"],
  ["fatalitiesLEA", "Other agency fatalities"],
  ["injuredLEA", "Other agency injured"],
  ["establishmentsBurned", "Establishments burned"],
  ["familiesAffected", "Families affected"],
  ["individualsAffected", "Individuals affected"],
  ["estimatedDamages", "Estimated damages (PHP)"],
  ["finalEstimatedDamages", "Final estimated damages (PHP)"],
] as const;

const RESOURCE_FIELDS = [
  ["fireTrucksResponded", "Fire trucks responded"],
  ["trucksBFPOwned", "Trucks BFP-owned"],
  ["trucksVolunteer", "Trucks volunteer"],
  ["trucksBFPManned", "Trucks BFP-manned"],
  ["ambulancesResponded", "Ambulances responded"],
  ["ambulancesBFPOwned", "Ambulances BFP-owned"],
  ["ambulancesVolunteer", "Ambulances volunteer"],
  ["ambulancesBFPManned", "Ambulances BFP-manned"],
] as const;

const PERSONNEL_FIELDS = [
  ["groundCommander", "Ground commander"],
  ["arsonInvestigator", "Arson investigator"],
  ["sender", "Sender"],
] as const;

const count = z.number().int().min(0).nullable().optional();

const extrasSchema = z
  .object({
    ...Object.fromEntries(IMPACT_FIELDS.map(([key]) => [key, count])),
    estimatedDamages: z.number().min(0).nullable().optional(),
    finalEstimatedDamages: z.number().min(0).nullable().optional(),
    ...Object.fromEntries(RESOURCE_FIELDS.map(([key]) => [key, count])),
    respondingTeam: z.string().max(200).optional(),
    groundCommander: z.string().max(200).optional(),
    arsonInvestigator: z.string().max(200).optional(),
    sender: z.string().max(200).optional(),
  })
  .refine(
    (values) => {
      const filled = PERSONNEL_FIELDS.filter(([key]) => values[key]?.trim());
      return filled.length === 0 || filled.length === PERSONNEL_FIELDS.length;
    },
    { message: "Fill in all three personnel fields, or none", path: ["sender"] },
  );

type Values = Record<string, number | string | null | undefined>;

const pick = (values: Values, keys: readonly (readonly [string, string])[]) =>
  Object.fromEntries(
    keys
      .map(([key]) => [key, values[key]])
      .filter(([, value]) => value !== null && value !== undefined && value !== ""),
  );

const IncidentExtrasCard = ({ incident }: { incident: FireIncidentDetail }) => {
  const user = useUserStore((state) => state.user);
  const [editing, setEditing] = useState(false);
  const { updateFireIncident, isPending } = useUpdateFireIncident();

  const methods = useForm<Values>({
    resolver: zodResolver(extrasSchema) as never,
    defaultValues: {
      ...incident.impact,
      ...incident.resources,
      ...incident.personnel,
      estimatedDamages: incident.impact?.estimatedDamages
        ? Number(incident.impact.estimatedDamages)
        : null,
      finalEstimatedDamages: incident.impact?.finalEstimatedDamages
        ? Number(incident.impact.finalEstimatedDamages)
        : null,
    },
  });

  const onSubmit = async (values: Values) => {
    const impact = pick(values, IMPACT_FIELDS);
    const resources = pick(values, [
      ...RESOURCE_FIELDS,
      ["respondingTeam", ""],
    ] as const);
    const personnel = pick(values, PERSONNEL_FIELDS);

    try {
      await updateFireIncident({
        id: incident.id,
        data: {
          ...(Object.keys(impact).length && { impact }),
          ...(Object.keys(resources).length && { resources }),
          ...(Object.keys(personnel).length === PERSONNEL_FIELDS.length && {
            personnel: personnel as never,
          }),
        },
      });
      setEditing(false);
    } catch {
      // The hook already showed the error.
    }
  };

  const show = (
    source: Record<string, unknown> | null,
    fields: readonly (readonly [string, string])[],
  ) =>
    source ? (
      <dl className='grid gap-2 sm:grid-cols-2'>
        {fields.map(([key, label]) => (
          <div key={key} className='flex justify-between gap-2 text-sm'>
            <dt className='text-muted-foreground'>{label}</dt>
            <dd>{String(source[key] ?? "—")}</dd>
          </div>
        ))}
      </dl>
    ) : (
      <p className='text-sm text-muted-foreground'>Not recorded yet.</p>
    );

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle className='text-base'>Impact, resources and personnel</CardTitle>
        {canEditIncident(user, incident) && (
          <Button size='sm' variant='outline' onClick={() => setEditing(true)}>
            <Pencil className='size-4' />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue='impact'>
          <TabsList>
            <TabsTrigger value='impact'>Impact</TabsTrigger>
            <TabsTrigger value='resources'>Resources</TabsTrigger>
            <TabsTrigger value='personnel'>Personnel</TabsTrigger>
          </TabsList>
          <TabsContent value='impact' className='pt-3'>
            {show(incident.impact, IMPACT_FIELDS)}
          </TabsContent>
          <TabsContent value='resources' className='pt-3'>
            {show(incident.resources, [
              ["respondingTeam", "Responding team"],
              ...RESOURCE_FIELDS,
            ])}
          </TabsContent>
          <TabsContent value='personnel' className='pt-3'>
            {show(
              incident.personnel as unknown as Record<string, unknown> | null,
              PERSONNEL_FIELDS,
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <NoButtonDialogComponent
        open={editing}
        modalOnChange={setEditing}
        dialogTitle='Impact, Resources and Personnel'
        dialogDescription='Leave a field empty if it is not known yet.'
        classname='sm:max-w-2xl'
      >
        <FormProvider {...methods}>
          <form
            onSubmit={methods.handleSubmit(onSubmit)}
            className='flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1'
          >
            <p className='text-sm font-medium'>Impact</p>
            <div className='grid gap-3 sm:grid-cols-2'>
              {IMPACT_FIELDS.map(([key, label]) => (
                <NumberField<Values> key={key} name={key} label={label} />
              ))}
            </div>
            <p className='text-sm font-medium'>Resources</p>
            <TextField<Values> name='respondingTeam' label='Responding team' />
            <div className='grid gap-3 sm:grid-cols-2'>
              {RESOURCE_FIELDS.map(([key, label]) => (
                <NumberField<Values> key={key} name={key} label={label} step='1' />
              ))}
            </div>
            <p className='text-sm font-medium'>Personnel</p>
            {PERSONNEL_FIELDS.map(([key, label]) => (
              <TextField<Values> key={key} name={key} label={label} />
            ))}
            <Button type='submit' disabled={isPending}>
              {isPending ? (
                <>
                  <Spinner />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </form>
        </FormProvider>
      </NoButtonDialogComponent>
    </Card>
  );
};

export default IncidentExtrasCard;
