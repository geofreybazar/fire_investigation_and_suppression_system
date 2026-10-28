import { Badge } from "@/components/ui/badge";
import { formatEnum } from "@/utils/formatEnum";
import type {
  FireIncidentStatus,
  IncidentApprovalStatus,
  ReportStatus,
} from "@/constants/fireIncident";

// One meaning per colour: red = active fire or rejected, amber = waiting or
// partly done, green = finished or approved, blue = being checked, grey =
// neutral. The tones use theme tokens (index.css) so dark mode keeps contrast.
type Tone = "danger" | "warning" | "success" | "info" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  danger: "border-transparent bg-destructive/10 text-destructive",
  warning: "border-transparent bg-warning/10 text-warning",
  success: "border-transparent bg-success/10 text-success",
  info: "border-transparent bg-info/10 text-info",
  neutral: "border-border text-muted-foreground",
};

const STATUS_TONE: Record<FireIncidentStatus, Tone> = {
  VERIFICATION: "info",
  ON_GOING: "danger",
  FIRE_UNDER_CONTROL: "warning",
  FIRE_OUT: "success",
  FIRE_OUT_UPON_ARRIVAL: "success",
  FALSE_ALARM: "neutral",
  REKINDLE: "danger",
};

const APPROVAL_TONE: Record<IncidentApprovalStatus, Tone> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

const REPORT_TONE: Record<ReportStatus, Tone> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  UNDER_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

const ToneBadge = ({ tone, label }: { tone: Tone; label: string }) => (
  <Badge variant='outline' className={TONE_CLASS[tone]}>
    {label}
  </Badge>
);

export const IncidentStatusBadge = ({
  status,
}: {
  status: FireIncidentStatus;
}) => <ToneBadge tone={STATUS_TONE[status]} label={formatEnum(status)} />;

export const ApprovalBadge = ({
  status,
}: {
  status: IncidentApprovalStatus;
}) => <ToneBadge tone={APPROVAL_TONE[status]} label={formatEnum(status)} />;

export const ReportStatusBadge = ({
  status,
}: {
  status?: ReportStatus | null;
}) =>
  status ? (
    <ToneBadge tone={REPORT_TONE[status]} label={formatEnum(status)} />
  ) : (
    <ToneBadge tone='neutral' label='No report yet' />
  );
