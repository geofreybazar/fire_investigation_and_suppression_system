import { Suspense, useState } from "react";
import { useNavigate } from "react-router";
import { ErrorBoundary } from "react-error-boundary";
import { Search } from "lucide-react";
import { useUserStore } from "@/store/userStore";
import useGetInvestigationQueue from "@/hooks/investigations/useGetInvestigationQueue";
import useGetAssignedInvestigations from "@/hooks/investigations/useGetAssignedInvestigations";
import {
  isChiefInvestigator,
  isInvestigator,
  isSuperAdmin,
} from "@/utils/incidentPermissions";
import { formatDateTime } from "@/utils/dateTime";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PaginationComponent from "@/components/common/PaginationComponent";
import ErrorFallbackComponent from "@/components/common/ErrorFallbackComponent";
import {
  IncidentStatusBadge,
  ReportStatusBadge,
} from "@/components/features/fireIncidents/StatusBadges";
import PageHeader from "@/components/common/PageHeader";
import { rowLinkProps } from "@/utils/rowLink";

const Empty = ({ text }: { text: string }) => (
  <div className='flex min-h-[200px] items-center justify-center rounded-lg border text-sm text-muted-foreground'>
    {text}
  </div>
);

// Incidents whose investigation decisions sit with the chief's office.
const QueueTable = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { queue } = useGetInvestigationQueue(page);

  if (queue.data.length === 0) {
    return <Empty text='No cases are handled by your office right now.' />;
  }

  return (
    <div className='flex flex-col overflow-x-auto rounded-lg border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Incident No.</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Latest investigation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {queue.data.map((incident) => {
            const latest = incident.investigations[0];

            return (
              <TableRow
                key={incident.id}
                className='cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring'
                {...rowLinkProps(() =>
                  navigate(`/fireincidents/${incident.id}`),
                )}
              >
                <TableCell className='font-medium'>
                  {incident.incidentNo}
                </TableCell>
                <TableCell>
                  <IncidentStatusBadge status={incident.fireIncidentStatus} />
                </TableCell>
                <TableCell className='text-muted-foreground'>
                  {incident.location
                    ? `${incident.location.barangay}, ${incident.location.city_municipality}`
                    : "—"}
                </TableCell>
                <TableCell>
                  {latest ? (
                    <div className='flex items-center gap-2'>
                      <span className='text-sm'>{latest.investigationNo}</span>
                      <ReportStatusBadge status={latest.report?.status} />
                    </div>
                  ) : (
                    <span className='text-sm text-muted-foreground'>None</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className='self-end'>
        <PaginationComponent
          totalPages={queue.pagination.totalPages}
          currentPage={page}
          setCurrentPage={setPage}
        />
      </div>
    </div>
  );
};

const AssignedTable = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { assigned } = useGetAssignedInvestigations(page);

  if (assigned.data.length === 0) {
    return <Empty text='No investigations are assigned to you.' />;
  }

  return (
    <div className='flex flex-col overflow-x-auto rounded-lg border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Investigation No.</TableHead>
            <TableHead>Office</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Report</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assigned.data.map((investigation) => (
            <TableRow
              key={investigation.id}
              className='cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring'
              {...rowLinkProps(() =>
                navigate(`/investigations/${investigation.id}`),
              )}
            >
              <TableCell className='font-medium'>
                {investigation.investigationNo}
              </TableCell>
              <TableCell>{investigation.conductingOffice.name}</TableCell>
              <TableCell className='text-muted-foreground'>
                {formatDateTime(investigation.startedAt)}
              </TableCell>
              <TableCell>
                <ReportStatusBadge status={investigation.report?.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className='self-end'>
        <PaginationComponent
          totalPages={assigned.pagination.totalPages}
          currentPage={page}
          setCurrentPage={setPage}
        />
      </div>
    </div>
  );
};

const Section = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary FallbackComponent={ErrorFallbackComponent}>
    <Suspense fallback={<Skeleton className='h-48 w-full' />}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

const Investigations = () => {
  const user = useUserStore((state) => state.user);
  const showQueue = isChiefInvestigator(user) || isSuperAdmin(user);
  const showAssigned = isInvestigator(user) || isSuperAdmin(user);

  return (
    <div className='space-y-6'>
      <PageHeader
        icon={<Search />}
        title='Investigations'
        description='Cases waiting on your office and investigations assigned to you.'
      />

      {!showQueue && !showAssigned && (
        <Empty text='Investigations are listed on each fire incident you can view.' />
      )}

      {showQueue && showAssigned && (
        <Tabs defaultValue='queue'>
          <TabsList>
            <TabsTrigger value='queue'>Case queue</TabsTrigger>
            <TabsTrigger value='assigned'>Assigned to me</TabsTrigger>
          </TabsList>
          <TabsContent value='queue' className='pt-4'>
            <Section>
              <QueueTable />
            </Section>
          </TabsContent>
          <TabsContent value='assigned' className='pt-4'>
            <Section>
              <AssignedTable />
            </Section>
          </TabsContent>
        </Tabs>
      )}

      {showQueue && !showAssigned && (
        <Section>
          <QueueTable />
        </Section>
      )}

      {showAssigned && !showQueue && (
        <Section>
          <AssignedTable />
        </Section>
      )}
    </div>
  );
};

export default Investigations;
