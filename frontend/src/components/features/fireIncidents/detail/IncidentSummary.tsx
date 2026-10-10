import type { FireIncidentDetail } from "@/interface/fireIncident/fireIncident";
import { formatEnum, personName } from "@/utils/formatEnum";
import { formatDateTime } from "@/utils/dateTime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApprovalBadge, IncidentStatusBadge } from "../StatusBadges";

const Item = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className='space-y-0.5'>
    <p className='text-xs text-muted-foreground'>{label}</p>
    <div className='text-sm'>{value ?? "—"}</div>
  </div>
);

const IncidentSummary = ({ incident }: { incident: FireIncidentDetail }) => {
  const { location } = incident;

  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Incident</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-3 sm:grid-cols-2'>
          <Item
            label='Status'
            value={<IncidentStatusBadge status={incident.fireIncidentStatus} />}
          />
          <Item
            label='Alarm level'
            value={
              incident.currentAlarmLevel
                ? formatEnum(incident.currentAlarmLevel)
                : "No alarm raised"
            }
          />
          <Item
            label='Approval'
            value={<ApprovalBadge status={incident.approvalStatus} />}
          />
          <Item label='Station' value={incident.office.name} />
          <Item
            label='Category'
            value={
              incident.subcategory
                ? `${incident.category.name} — ${incident.subcategory.name}`
                : incident.category.name
            }
          />
          <Item label='Recorded by' value={personName(incident.createdBy)} />
          <Item
            label='Fire incident'
            value={formatDateTime(incident.dateTimeFireIncident)}
          />
          <Item
            label='Call received'
            value={formatDateTime(incident.dateTimeCallReceived)}
          />
          <Item
            label='Reported'
            value={formatDateTime(incident.dateTimeReported)}
          />
          <Item
            label='Unresponded'
            value={formatDateTime(incident.dateTimeUnresponded)}
          />
          {incident.remarks && (
            <div className='sm:col-span-2'>
              <Item label='Remarks' value={incident.remarks} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Location</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-3 sm:grid-cols-2'>
          <div className='sm:col-span-2'>
            <Item label='Place of occurrence' value={location.placeOfOccurence} />
          </div>
          <Item label='Barangay' value={location.barangay} />
          <Item label='City / municipality' value={location.city_municipality} />
          <Item label='Province / district' value={location.province_district} />
          <Item label='Region' value={location.region} />
          <Item
            label='Coordinates'
            value={
              location.latitude && location.longitude
                ? `${location.latitude}, ${location.longitude}`
                : "Not set"
            }
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default IncidentSummary;
