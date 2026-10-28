import type {
  FireIncidentStatus,
  IncidentApprovalStatus,
  ReportStatus,
} from "@/constants/fireIncident";

// One meaning per colour: red = active fire or rejected, amber = waiting or
// partly done, green = finished or approved, blue = being checked, grey =
// neutral. The tones use theme tokens (index.css) so dark mode keeps contrast.
export type Tone = "danger" | "warning" | "success" | "info" | "neutral";

export const TONE_CLASS: Record<Tone, string> = {
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

// The same tones as theme colours, for charts and map markers.
const TONE_COLOR: Record<Tone, string> = {
  danger: "var(--destructive)",
  warning: "var(--warning)",
  success: "var(--success)",
  info: "var(--info)",
  neutral: "var(--muted-foreground)",
};

export const statusColor = (status: FireIncidentStatus) =>
  TONE_COLOR[STATUS_TONE[status]];

export const statusTone = (status: FireIncidentStatus) => STATUS_TONE[status];

export const APPROVAL_TONE: Record<IncidentApprovalStatus, Tone> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

export const REPORT_TONE: Record<ReportStatus, Tone> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  UNDER_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};
