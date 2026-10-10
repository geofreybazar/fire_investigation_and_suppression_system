import z from "zod";
import type { Pagination } from "../pagination";
import type {
  IncidentLocation,
  OfficeSummary,
  UserSummary,
} from "../fireIncident/fireIncident";
import type {
  CauseOfFire,
  FireCaseClassification,
  FireIncidentStatus,
  ReportStatus,
} from "@/constants/fireIncident";

export interface InvestigationSummary {
  id: string;
  investigationNo: string;
  startedAt: string;
  completedAt: string | null;
  conductingOffice: OfficeSummary;
  assignedInvestigator: UserSummary;
  assignedBy: UserSummary;
  report: { status: ReportStatus } | null;
}

export interface Referral {
  id: string;
  direction: "UP" | "DOWN";
  remarks: string | null;
  createdAt: string;
  fromOffice: OfficeSummary;
  toOffice: OfficeSummary;
  referredBy: UserSummary;
}

export interface ReferralTarget extends OfficeSummary {
  direction: "UP" | "DOWN";
}

export interface InvestigationCase {
  incidentId: string;
  incidentNo: string | null;
  fireIncidentStatus: FireIncidentStatus;
  handlingOffice?: OfficeSummary;
  investigable: boolean;
  canDecide: boolean;
  referralTargets: ReferralTarget[];
  referrals: Referral[];
  investigations: InvestigationSummary[];
}

export interface InvestigatorCandidate extends UserSummary {
  role: string;
}

export interface ReportReview {
  id: string;
  decision: "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  remarks: string | null;
  createdAt: string;
  reviewer: UserSummary;
}

export interface InvestigationReport {
  id: string;
  status: ReportStatus;
  findings: string | null;
  cause: string | null;
  conclusion: string | null;
  recommendations: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: UserSummary | null;
  reviews: ReportReview[];
}

export interface InvestigationDetail {
  id: string;
  investigationNo: string;
  causeOfFire: CauseOfFire | null;
  classification: FireCaseClassification | null;
  originOfFire: string | null;
  startedAt: string;
  completedAt: string | null;
  conductingOfficeId: string;
  assignedInvestigatorId: string;
  conductingOffice: OfficeSummary;
  assignedInvestigator: UserSummary;
  assignedBy: UserSummary;
  fireIncident: {
    id: string;
    incidentNo: string | null;
    fireIncidentStatus: FireIncidentStatus;
    office: OfficeSummary;
    location: IncidentLocation | null;
  };
  report: InvestigationReport | null;
}

export interface QueueItem {
  id: string;
  incidentNo: string | null;
  fireIncidentStatus: FireIncidentStatus;
  createdAt: string;
  office: OfficeSummary;
  location: Pick<
    IncidentLocation,
    "placeOfOccurence" | "barangay" | "city_municipality"
  > | null;
  investigations: {
    id: string;
    investigationNo: string;
    completedAt: string | null;
    report: { status: ReportStatus } | null;
  }[];
}

export interface AssignedItem {
  id: string;
  investigationNo: string;
  startedAt: string;
  completedAt: string | null;
  conductingOffice: OfficeSummary;
  fireIncident: { id: string; incidentNo: string | null };
  report: { status: ReportStatus } | null;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

export const investigationDraftSchema = z.object({
  classification: z.string().optional(),
  causeOfFire: z.string().optional(),
  originOfFire: z.string().max(2000).optional(),
  findings: z.string().max(20000).optional(),
  cause: z.string().max(5000).optional(),
  conclusion: z.string().max(20000).optional(),
  recommendations: z.string().max(20000).optional(),
});
export type InvestigationDraftFormValues = z.infer<
  typeof investigationDraftSchema
>;

export interface InvestigationDraftPayload {
  classification?: FireCaseClassification | null;
  causeOfFire?: CauseOfFire | null;
  originOfFire?: string | null;
  report?: {
    findings?: string | null;
    cause?: string | null;
    conclusion?: string | null;
    recommendations?: string | null;
  };
}

export type ReviewDecision = "UNDER_REVIEW" | "APPROVED" | "REJECTED";
