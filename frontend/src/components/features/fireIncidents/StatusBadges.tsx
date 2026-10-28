import { Badge } from "@/components/ui/badge";
import { formatEnum } from "@/utils/formatEnum";
import {
  APPROVAL_TONE,
  REPORT_TONE,
  statusTone,
  TONE_CLASS,
  type Tone,
} from "@/utils/statusTone";
import type {
  FireIncidentStatus,
  IncidentApprovalStatus,
  ReportStatus,
} from "@/constants/fireIncident";

const ToneBadge = ({ tone, label }: { tone: Tone; label: string }) => (
  <Badge variant='outline' className={TONE_CLASS[tone]}>
    {label}
  </Badge>
);

export const IncidentStatusBadge = ({
  status,
}: {
  status: FireIncidentStatus;
}) => <ToneBadge tone={statusTone(status)} label={formatEnum(status)} />;

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
