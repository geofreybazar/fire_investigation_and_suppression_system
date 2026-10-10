import { Badge } from "@/components/ui/badge";
import { formatEnum } from "@/utils/formatEnum";
import type {
  FireIncidentStatus,
  IncidentApprovalStatus,
  ReportStatus,
} from "@/constants/fireIncident";

type Variant = "default" | "secondary" | "destructive" | "outline";

const STATUS_VARIANT: Record<FireIncidentStatus, Variant> = {
  VERIFICATION: "outline",
  ON_GOING: "destructive",
  FIRE_UNDER_CONTROL: "secondary",
  FIRE_OUT: "default",
  FIRE_OUT_UPON_ARRIVAL: "default",
  FALSE_ALARM: "outline",
  REKINDLE: "destructive",
};

const APPROVAL_VARIANT: Record<IncidentApprovalStatus, Variant> = {
  PENDING: "secondary",
  APPROVED: "outline",
  REJECTED: "destructive",
};

const REPORT_VARIANT: Record<ReportStatus, Variant> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  UNDER_REVIEW: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
};

export const IncidentStatusBadge = ({
  status,
}: {
  status: FireIncidentStatus;
}) => <Badge variant={STATUS_VARIANT[status]}>{formatEnum(status)}</Badge>;

export const ApprovalBadge = ({
  status,
}: {
  status: IncidentApprovalStatus;
}) => <Badge variant={APPROVAL_VARIANT[status]}>{formatEnum(status)}</Badge>;

export const ReportStatusBadge = ({
  status,
}: {
  status?: ReportStatus | null;
}) =>
  status ? (
    <Badge variant={REPORT_VARIANT[status]}>{formatEnum(status)}</Badge>
  ) : (
    <Badge variant='outline'>No report yet</Badge>
  );
