import { useNavigate } from "react-router";
import { Flame, RotateCcw } from "lucide-react";
import useGetFireIncidents from "@/hooks/fireIncidents/useGetFireIncidents";
import type { FireIncidentListFilters } from "@/interface/fireIncident/fireIncident";
import { formatEnum } from "@/utils/formatEnum";
import { formatDateTime } from "@/utils/dateTime";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PaginationComponent from "@/components/common/PaginationComponent";
import { ApprovalBadge, IncidentStatusBadge } from "../StatusBadges";

interface IncidentTableProps {
  filters: FireIncidentListFilters;
  setCurrentPage: (page: number) => void;
  onClearFilters: () => void;
}

const IncidentTable = ({
  filters,
  setCurrentPage,
  onClearFilters,
}: IncidentTableProps) => {
  const navigate = useNavigate();
  const { fireIncidents } = useGetFireIncidents(filters);
  const hasFilters = Boolean(
    filters.search || filters.status || filters.approvalStatus,
  );

  if (fireIncidents.data.length === 0) {
    return (
      <div className='flex min-h-[280px] flex-col items-center justify-center rounded-lg border px-6 py-10 text-center'>
        <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-muted'>
          <Flame className='size-6 text-muted-foreground' />
        </div>
        <h3 className='text-base font-semibold'>No Fire Incidents Found</h3>
        <p className='mt-1 max-w-sm text-sm text-muted-foreground'>
          {hasFilters
            ? "No incidents match your filters."
            : "There are no fire incidents you can view yet."}
        </p>
        {hasFilters && (
          <Button
            variant='outline'
            size='sm'
            className='mt-4'
            onClick={onClearFilters}
          >
            <RotateCcw className='size-4' />
            Clear Filters
          </Button>
        )}
      </div>
    );
  }

  const open = (id: string) => navigate(`/fireincidents/${id}`);

  return (
    <div className='flex flex-col rounded-lg border'>
      <div className='hidden md:block'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Incident No.</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Station</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fireIncidents.data.map((incident) => (
              <TableRow
                key={incident.id}
                className='cursor-pointer'
                onClick={() => open(incident.id)}
              >
                <TableCell className='font-medium'>
                  {incident.incidentNo ?? (
                    <ApprovalBadge status={incident.approvalStatus} />
                  )}
                </TableCell>
                <TableCell>
                  <div className='flex flex-col items-start gap-1'>
                    <IncidentStatusBadge status={incident.fireIncidentStatus} />
                    {incident.currentAlarmLevel && (
                      <span className='text-xs text-muted-foreground'>
                        {formatEnum(incident.currentAlarmLevel)}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{incident.category.name}</TableCell>
                <TableCell className='text-muted-foreground'>
                  {incident.location
                    ? `${incident.location.barangay}, ${incident.location.city_municipality}`
                    : "—"}
                </TableCell>
                <TableCell className='text-muted-foreground'>
                  {incident.office.name}
                </TableCell>
                <TableCell className='text-muted-foreground'>
                  {formatDateTime(incident.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className='space-y-3 p-3 md:hidden'>
        {fireIncidents.data.map((incident) => (
          <Card
            key={incident.id}
            className='cursor-pointer'
            onClick={() => open(incident.id)}
          >
            <CardContent className='space-y-2 p-4'>
              <div className='flex items-center justify-between gap-2'>
                <span className='font-medium'>
                  {incident.incidentNo ?? "No number yet"}
                </span>
                <IncidentStatusBadge status={incident.fireIncidentStatus} />
              </div>
              <p className='text-sm'>{incident.category.name}</p>
              <p className='text-xs text-muted-foreground'>
                {incident.location?.barangay}, {incident.office.name}
              </p>
              {!incident.incidentNo && (
                <ApprovalBadge status={incident.approvalStatus} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className='self-end'>
        <PaginationComponent
          totalPages={fireIncidents.pagination.totalPages}
          currentPage={filters.page}
          setCurrentPage={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default IncidentTable;
