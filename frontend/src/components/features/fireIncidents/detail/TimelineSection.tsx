import { useState } from "react";
import { Ban, Pencil, Plus } from "lucide-react";
import { useUserStore } from "@/store/userStore";
import useAddTimelineEntry from "@/hooks/fireIncidents/useAddTimelineEntry";
import useVoidTimelineEntry from "@/hooks/fireIncidents/useVoidTimelineEntry";
import useCorrectTimelineEntry from "@/hooks/fireIncidents/useCorrectTimelineEntry";
import type {
  FireIncidentDetail,
  TimelineEntry,
} from "@/interface/fireIncident/fireIncident";
import { canEditIncident } from "@/utils/incidentPermissions";
import { formatEnum, personName } from "@/utils/formatEnum";
import { formatDateTime } from "@/utils/dateTime";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import NoButtonDialogComponent from "@/components/common/NoButtonDialogComponent";
import TimelineEntryForm from "../form/TimelineEntryForm";
import ReasonForm from "../form/ReasonForm";
import { IncidentStatusBadge } from "../StatusBadges";

const ignoreError = () => {}; // The hooks already show the error.

const TimelineSection = ({ incident }: { incident: FireIncidentDetail }) => {
  const user = useUserStore((state) => state.user);
  const [adding, setAdding] = useState(false);
  const [voiding, setVoiding] = useState<TimelineEntry>();
  const [correcting, setCorrecting] = useState<TimelineEntry>();

  const { addTimelineEntry, isPending: isAdding } = useAddTimelineEntry();
  const { voidTimelineEntry, isPending: isVoiding } = useVoidTimelineEntry();
  const { correctTimelineEntry, isPending: isCorrecting } =
    useCorrectTimelineEntry();

  const isEditor = canEditIncident(user, incident);

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle className='text-base'>Status timeline</CardTitle>
        {isEditor && (
          <Button size='sm' onClick={() => setAdding(true)}>
            <Plus className='size-4' />
            Add update
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ol className='space-y-3'>
          {incident.timeline.map((entry) => {
            const voided = entry.voidedAt !== null;

            return (
              <li
                key={entry.id}
                className={`rounded-md border p-3 ${voided ? "opacity-60" : ""}`}
              >
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='text-sm font-medium'>
                    {formatDateTime(entry.occurredAt)}
                  </span>
                  <IncidentStatusBadge status={entry.status} />
                  <span className='text-xs text-muted-foreground'>
                    {entry.alarmLevel
                      ? formatEnum(entry.alarmLevel)
                      : "No alarm"}
                  </span>
                  {entry.correctsEntryId && (
                    <Badge variant='outline'>Correction</Badge>
                  )}
                  {voided && <Badge variant='destructive'>Voided</Badge>}

                  {isEditor && !voided && (
                    <div className='ml-auto flex gap-1'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => setCorrecting(entry)}
                      >
                        <Pencil className='size-3.5' />
                        Correct
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => setVoiding(entry)}
                      >
                        <Ban className='size-3.5' />
                        Void
                      </Button>
                    </div>
                  )}
                </div>
                {entry.remarks && <p className='mt-1 text-sm'>{entry.remarks}</p>}
                <p className='mt-1 text-xs text-muted-foreground'>
                  Recorded by {personName(entry.createdBy)} on{" "}
                  {formatDateTime(entry.createdAt)}
                  {voided &&
                    ` · voided by ${personName(entry.voidedBy)}: ${entry.voidReason}`}
                </p>
              </li>
            );
          })}
        </ol>
      </CardContent>

      <NoButtonDialogComponent
        open={adding}
        modalOnChange={setAdding}
        dialogTitle='Add Status Update'
        dialogDescription='Record a status or alarm change and when it happened.'
      >
        <TimelineEntryForm
          submitLabel='Add update'
          isPending={isAdding}
          onSubmit={(entry) =>
            addTimelineEntry({ id: incident.id, entry })
              .then(() => setAdding(false))
              .catch(ignoreError)
          }
        />
      </NoButtonDialogComponent>

      <NoButtonDialogComponent
        open={!!correcting}
        modalOnChange={(open) => !open && setCorrecting(undefined)}
        dialogTitle='Correct Entry'
        dialogDescription='The original entry is kept in the history and marked as corrected.'
      >
        {correcting && (
          <TimelineEntryForm
            initial={correcting}
            withReason
            submitLabel='Save correction'
            isPending={isCorrecting}
            onSubmit={(entry, reason) =>
              correctTimelineEntry({
                id: incident.id,
                entryId: correcting.id,
                reason: reason ?? "",
                entry,
              })
                .then(() => setCorrecting(undefined))
                .catch(ignoreError)
            }
          />
        )}
      </NoButtonDialogComponent>

      <NoButtonDialogComponent
        open={!!voiding}
        modalOnChange={(open) => !open && setVoiding(undefined)}
        dialogTitle='Void Entry'
        dialogDescription='The entry stays in the history but no longer counts.'
      >
        {voiding && (
          <ReasonForm
            label='Reason'
            submitLabel='Void entry'
            destructive
            isPending={isVoiding}
            onSubmit={(reason) =>
              voidTimelineEntry({
                id: incident.id,
                entryId: voiding.id,
                reason,
              })
                .then(() => setVoiding(undefined))
                .catch(ignoreError)
            }
          />
        )}
      </NoButtonDialogComponent>
    </Card>
  );
};

export default TimelineSection;
