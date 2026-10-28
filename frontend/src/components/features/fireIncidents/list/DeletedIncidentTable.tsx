import { useState } from "react";
import { ArchiveRestore } from "lucide-react";
import useGetDeletedFireIncidents from "@/hooks/fireIncidents/useGetDeletedFireIncidents";
import useRestoreFireIncident from "@/hooks/fireIncidents/useRestoreFireIncident";
import { formatDateTime } from "@/utils/dateTime";
import { personName } from "@/utils/formatEnum";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import PaginationComponent from "@/components/common/PaginationComponent";
import AlertDialogComponent from "@/components/common/AlertDialogComponent";
import type { DeletedFireIncident } from "@/interface/fireIncident/fireIncident";

// SUPER_ADMIN only: incidents that were deleted (hidden), with restore.
const DeletedIncidentTable = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<DeletedFireIncident>();
  const { deletedFireIncidents } = useGetDeletedFireIncidents(currentPage);
  const { restoreFireIncident } = useRestoreFireIncident();

  if (deletedFireIncidents.data.length === 0) {
    return (
      <div className='flex min-h-[200px] items-center justify-center rounded-lg border text-sm text-muted-foreground'>
        No deleted incidents.
      </div>
    );
  }

  return (
    <div className='flex flex-col overflow-x-auto rounded-lg border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Incident No.</TableHead>
            <TableHead>Station</TableHead>
            <TableHead>Deleted</TableHead>
            <TableHead>By</TableHead>
            <TableHead>Memo</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className='w-12' />
          </TableRow>
        </TableHeader>
        <TableBody>
          {deletedFireIncidents.data.map((incident) => (
            <TableRow key={incident.id}>
              <TableCell className='font-medium'>
                {incident.incidentNo ?? "Never approved"}
              </TableCell>
              <TableCell>{incident.office.name}</TableCell>
              <TableCell>{formatDateTime(incident.deletedAt)}</TableCell>
              <TableCell>{personName(incident.deletedBy)}</TableCell>
              <TableCell>{incident.deletionMemoReference ?? "—"}</TableCell>
              <TableCell className='max-w-xs truncate text-muted-foreground'>
                {incident.deletionReason ?? "—"}
              </TableCell>
              <TableCell>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setSelected(incident)}
                >
                  <ArchiveRestore className='size-4' />
                  Restore
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className='self-end'>
        <PaginationComponent
          totalPages={deletedFireIncidents.pagination.totalPages}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
      </div>

      <AlertDialogComponent
        open={!!selected}
        setOpen={(open) => !open && setSelected(undefined)}
        title='Restore incident?'
        description='The incident and all its records will be visible again with the same number.'
        action={{
          label: "Restore",
          onClick: () => {
            if (selected) restoreFireIncident(selected.id).catch(() => {});
            setSelected(undefined);
          },
        }}
      />
    </div>
  );
};

export default DeletedIncidentTable;
