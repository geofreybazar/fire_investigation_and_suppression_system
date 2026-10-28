import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Map } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import ErrorFallbackComponent from "@/components/common/ErrorFallbackComponent";
import { Skeleton } from "@/components/ui/skeleton";
import StatisticsFilterBar from "@/components/features/statistics/StatisticsFilterBar";
import { toStatisticsFilters, yearToDate } from "@/utils/statisticsFilters";
import IncidentMapView from "@/components/features/statistics/IncidentMapView";

const LEGEND = [
  { tone: "danger", label: "On going / rekindle" },
  { tone: "warning", label: "Under control" },
  { tone: "success", label: "Fire out" },
  { tone: "info", label: "Verification" },
  { tone: "neutral", label: "False alarm" },
];

const IncidentMap = () => {
  const [filters, setFilters] = useState(yearToDate);

  return (
    <div className='space-y-6'>
      <PageHeader
        icon={<Map />}
        title='Incident Map'
        description='Approved fire incidents in your office and the offices below it.'
      />

      <StatisticsFilterBar value={filters} onChange={setFilters} />

      <ul className='flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground'>
        {LEGEND.map((item) => (
          <li key={item.tone} className='flex items-center gap-1.5'>
            <span
              aria-hidden
              className={`legend-dot incident-marker--${item.tone}`}
            />
            {item.label}
          </li>
        ))}
      </ul>

      <ErrorBoundary FallbackComponent={ErrorFallbackComponent}>
        <Suspense
          fallback={<Skeleton className='h-[65vh] min-h-[400px] w-full' />}
        >
          <IncidentMapView filters={toStatisticsFilters(filters)} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

export default IncidentMap;
