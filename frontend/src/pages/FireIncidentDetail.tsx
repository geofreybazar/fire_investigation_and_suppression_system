import { Suspense } from "react";
import { Link, useParams } from "react-router";
import { ErrorBoundary } from "react-error-boundary";
import { ArrowLeft } from "lucide-react";
import useGetFireIncident from "@/hooks/fireIncidents/useGetFireIncident";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorFallbackComponent from "@/components/common/ErrorFallbackComponent";
import IncidentSummary from "@/components/features/fireIncidents/detail/IncidentSummary";
import IncidentActions from "@/components/features/fireIncidents/detail/IncidentActions";
import TimelineSection from "@/components/features/fireIncidents/detail/TimelineSection";
import EventHistory from "@/components/features/fireIncidents/detail/EventHistory";
import IncidentExtrasCard from "@/components/features/fireIncidents/detail/IncidentExtrasCard";
import InvestigationCaseSection from "@/components/features/fireIncidents/detail/InvestigationCaseSection";

const IncidentDetail = ({ id }: { id: string }) => {
  const { fireIncident } = useGetFireIncident(id);

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>
            {fireIncident.incidentNo ?? "Unnumbered incident"}
          </h1>
          <p className='text-sm text-muted-foreground'>
            {fireIncident.incidentNo
              ? `${fireIncident.location.barangay}, ${fireIncident.location.city_municipality}`
              : "The incident number is assigned when it is approved."}
          </p>
        </div>
        <IncidentActions incident={fireIncident} />
      </div>

      <IncidentSummary incident={fireIncident} />
      <TimelineSection incident={fireIncident} />
      <IncidentExtrasCard incident={fireIncident} />

      <ErrorBoundary FallbackComponent={ErrorFallbackComponent}>
        <Suspense fallback={<Skeleton className='h-32 w-full' />}>
          <InvestigationCaseSection incidentId={fireIncident.id} />
        </Suspense>
      </ErrorBoundary>

      <EventHistory events={fireIncident.events} />
    </div>
  );
};

const FireIncidentDetail = () => {
  const { id } = useParams();

  return (
    <div className='space-y-4'>
      <Link
        to='/fireincidents'
        className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'
      >
        <ArrowLeft className='size-4' />
        Fire incidents
      </Link>
      <ErrorBoundary FallbackComponent={ErrorFallbackComponent}>
        <Suspense fallback={<Skeleton className='h-96 w-full' />}>
          {id && <IncidentDetail id={id} />}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

export default FireIncidentDetail;
