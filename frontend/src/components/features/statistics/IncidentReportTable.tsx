import { useNavigate } from "react-router";
import { FileText } from "lucide-react";
import { useGetIncidentReport } from "@/hooks/statistics/useStatistics";
import type { StatisticsFilters } from "@/interface/statistics/statistics";
import { formatEnum } from "@/utils/formatEnum";
import { formatDateTime } from "@/utils/dateTime";
import { formatPeso } from "@/utils/formatNumber";
import { rowLinkProps } from "@/utils/rowLink";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import EmptyState from "@/components/common/EmptyState";
import PaginationComponent from "@/components/common/PaginationComponent";
import { IncidentStatusBadge } from "@/components/features/fireIncidents/StatusBadges";

interface IncidentReportTableProps {
  filters: StatisticsFilters;
  page: number;
  setPage: (page: number) => void;
}

const FOCUS_RING =
  "cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";

const IncidentReportTable = ({
  filters,
  page,
  setPage,
}: IncidentReportTableProps) => {
  const navigate = useNavigate();
  const { report } = useGetIncidentReport(filters, page);

  if (report.data.length === 0) {
    return (
      <EmptyState
        icon={<FileText />}
        title='No incidents'
        description='No approved incidents match these filters.'
      />
    );
  }

  const open = (id: string) => () => navigate(`/fireincidents/${id}`);

  return (
    <div className='flex flex-col rounded-lg border'>
      <p className='border-b px-4 py-2 text-sm text-muted-foreground'>
        {report.pagination.total} incident
        {report.pagination.total === 1 ? "" : "s"}
      </p>

      <div className='hidden overflow-x-auto md:block'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Incident No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className='text-right'>Deaths</TableHead>
              <TableHead className='text-right'>Damages</TableHead>
              <TableHead>Cause</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.data.map((row) => (
              <TableRow
                key={row.id}
                className={FOCUS_RING}
                {...rowLinkProps(open(row.id))}
              >
                <TableCell className='font-medium whitespace-nowrap'>
                  {row.incidentNo}
                </TableCell>
                <TableCell className='whitespace-nowrap text-muted-foreground'>
                  {formatDateTime(row.incidentDate)}
                </TableCell>
                <TableCell>
                  <IncidentStatusBadge status={row.status} />
                </TableCell>
                <TableCell>{row.category}</TableCell>
                <TableCell className='text-muted-foreground'>
                  {[row.barangay, row.cityMunicipality]
                    .filter(Boolean)
                    .join(", ")}
                </TableCell>
                <TableCell className='text-right tabular-nums'>
                  {row.fatalitiesCiv + row.fatalitiesBFP}
                </TableCell>
                <TableCell className='text-right tabular-nums whitespace-nowrap'>
                  {row.estimatedDamages === null
                    ? "—"
                    : formatPeso(row.estimatedDamages)}
                </TableCell>
                <TableCell className='text-muted-foreground'>
                  {row.causeOfFire ? formatEnum(row.causeOfFire) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className='space-y-3 p-3 md:hidden'>
        {report.data.map((row) => (
          <Card
            key={row.id}
            className={FOCUS_RING}
            {...rowLinkProps(open(row.id))}
          >
            <CardContent className='space-y-2 p-4'>
              <div className='flex items-center justify-between gap-2'>
                <span className='font-medium'>{row.incidentNo}</span>
                <IncidentStatusBadge status={row.status} />
              </div>
              <p className='text-sm'>{row.category}</p>
              <p className='text-xs text-muted-foreground'>
                {[row.barangay, row.cityMunicipality]
                  .filter(Boolean)
                  .join(", ")}{" "}
                · {formatDateTime(row.incidentDate)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className='self-end'>
        <PaginationComponent
          totalPages={report.pagination.totalPages}
          currentPage={page}
          setCurrentPage={setPage}
        />
      </div>
    </div>
  );
};

export default IncidentReportTable;
