import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Flame, Plus, Search } from "lucide-react";
import useDebounce from "@/hooks/useDebounce";
import { useUserStore } from "@/store/userStore";
import {
  APPROVAL_STATUSES,
  FIRE_INCIDENT_STATUSES,
  STATION_CHIEF_ROLE,
  type FireIncidentStatus,
  type IncidentApprovalStatus,
} from "@/constants/fireIncident";
import {
  canViewIncidents,
  isIncidentEditor,
  isSuperAdmin,
} from "@/utils/incidentPermissions";
import { formatEnum } from "@/utils/formatEnum";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DialogComponent from "@/components/common/DialogComponent";
import ErrorFallbackComponent from "@/components/common/ErrorFallbackComponent";
import TableSkeleton from "@/components/common/TableSkeleton";
import IncidentTable from "@/components/features/fireIncidents/list/IncidentTable";
import DeletedIncidentTable from "@/components/features/fireIncidents/list/DeletedIncidentTable";
import SubmitIncidentForm from "@/components/features/fireIncidents/form/SubmitIncidentForm";

const ALL = "ALL";

const FireIncidents = () => {
  const user = useUserStore((state) => state.user);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [approvalStatus, setApprovalStatus] = useState<string>(ALL);
  const [openSubmit, setOpenSubmit] = useState(false);
  const debouncedSearch = useDebounce(search, 500);

  if (!canViewIncidents(user)) {
    return (
      <div className='rounded-lg border p-10 text-center text-sm text-muted-foreground'>
        Your role does not have access to fire incidents.
      </div>
    );
  }

  // Only the station operations group and SUPER_ADMIN see unapproved incidents.
  const seesUnapproved =
    isIncidentEditor(user) ||
    user?.role === STATION_CHIEF_ROLE ||
    isSuperAdmin(user);

  const filters = {
    page: currentPage,
    search: debouncedSearch || undefined,
    status: status === ALL ? undefined : (status as FireIncidentStatus),
    approvalStatus:
      approvalStatus === ALL
        ? undefined
        : (approvalStatus as IncidentApprovalStatus),
  };

  const clearFilters = () => {
    setSearch("");
    setStatus(ALL);
    setApprovalStatus(ALL);
    setCurrentPage(1);
  };

  const list = (
    <div className='space-y-4'>
      <div className='flex flex-col gap-3 sm:flex-row'>
        <div className='relative flex-1'>
          <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            placeholder='Search incident number'
            className='pl-9'
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value ?? ALL);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className='sm:w-52'>
            <SelectValue>
              {status === ALL ? "All statuses" : formatEnum(status)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {FIRE_INCIDENT_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {formatEnum(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {seesUnapproved && (
          <Select
            value={approvalStatus}
            onValueChange={(value) => {
              setApprovalStatus(value ?? ALL);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className='sm:w-44'>
              <SelectValue>
                {approvalStatus === ALL
                  ? "Any approval"
                  : formatEnum(approvalStatus)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any approval</SelectItem>
              {APPROVAL_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {formatEnum(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <ErrorBoundary FallbackComponent={ErrorFallbackComponent}>
        <Suspense fallback={<TableSkeleton />}>
          <IncidentTable
            filters={filters}
            setCurrentPage={setCurrentPage}
            onClearFilters={clearFilters}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-3'>
          <div className='flex size-10 items-center justify-center rounded-lg border bg-muted/50'>
            <Flame className='size-5' />
          </div>
          <div>
            <h1 className='text-2xl font-semibold tracking-tight'>
              Fire Incidents
            </h1>
            <p className='text-sm text-muted-foreground'>
              Record, approve and monitor fire incidents.
            </p>
          </div>
        </div>

        {isIncidentEditor(user) && (
          <DialogComponent
            open={openSubmit}
            modalOnChange={setOpenSubmit}
            buttonLabel='Record Fire Incident'
            dialogTitle='Record Fire Incident'
            dialogDescription="The incident is sent to your station's chief of operations for approval."
            icon={<Plus className='mr-2 size-4' />}
            classname='sm:max-w-2xl'
          >
            <SubmitIncidentForm onDone={() => setOpenSubmit(false)} />
          </DialogComponent>
        )}
      </div>

      {isSuperAdmin(user) ? (
        <Tabs defaultValue='incidents'>
          <TabsList>
            <TabsTrigger value='incidents'>Incidents</TabsTrigger>
            <TabsTrigger value='deleted'>Deleted</TabsTrigger>
          </TabsList>
          <TabsContent value='incidents' className='pt-4'>
            {list}
          </TabsContent>
          <TabsContent value='deleted' className='pt-4'>
            <ErrorBoundary FallbackComponent={ErrorFallbackComponent}>
              <Suspense fallback={<TableSkeleton />}>
                <DeletedIncidentTable />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      ) : (
        list
      )}
    </div>
  );
};

export default FireIncidents;
