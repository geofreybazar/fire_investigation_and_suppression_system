import type { FireIncidentEvent } from "@/interface/fireIncident/fireIncident";
import { formatEnum, personName } from "@/utils/formatEnum";
import { formatDateTime } from "@/utils/dateTime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Submission, approval, rejection, removal, deletion and restore.
const EventHistory = ({ events }: { events: FireIncidentEvent[] }) => (
  <Card>
    <CardHeader>
      <CardTitle className='text-base'>Approval history</CardTitle>
    </CardHeader>
    <CardContent>
      <ul className='space-y-2'>
        {events.map((event) => (
          <li key={event.id} className='text-sm'>
            <span className='font-medium'>{formatEnum(event.type)}</span>{" "}
            <span className='text-muted-foreground'>
              by {personName(event.actor)} on {formatDateTime(event.createdAt)}
            </span>
            {event.remarks && (
              <p className='text-muted-foreground'>“{event.remarks}”</p>
            )}
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);

export default EventHistory;
