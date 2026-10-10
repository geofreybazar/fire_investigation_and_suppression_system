import z from "zod";
import type { Pagination } from "../pagination";
import {
  ALARM_LEVELS,
  FIRE_INCIDENT_STATUSES,
  type FireAlarmLevel,
  type FireIncidentStatus,
  type IncidentApprovalStatus,
} from "@/constants/fireIncident";

export interface UserSummary {
  id: string;
  rank: string;
  first_name: string;
  last_name: string;
}

export interface OfficeSummary {
  id: string;
  name: string;
  type?: string;
}

export interface IncidentLocation {
  placeOfOccurence: string;
  barangay: string;
  city_municipality: string;
  province_district: string;
  region: string;
  latitude?: string | null;
  longitude?: string | null;
}

export interface FireIncidentListItem {
  id: string;
  incidentNo: string | null;
  fireIncidentStatus: FireIncidentStatus;
  currentAlarmLevel: FireAlarmLevel | null;
  approvalStatus: IncidentApprovalStatus;
  dateTimeFireIncident: string | null;
  createdAt: string;
  category: { id: string; name: string };
  subcategory: { id: string; name: string } | null;
  office: OfficeSummary;
  location: IncidentLocation | null;
}

export interface PaginatedFireIncidents {
  data: FireIncidentListItem[];
  pagination: Pagination;
}

export interface DeletedFireIncident extends FireIncidentListItem {
  deletedAt: string;
  deletionReason: string | null;
  deletedBy: UserSummary | null;
}

export interface PaginatedDeletedFireIncidents {
  data: DeletedFireIncident[];
  pagination: Pagination;
}

export interface TimelineEntry {
  id: string;
  status: FireIncidentStatus;
  alarmLevel: FireAlarmLevel | null;
  occurredAt: string;
  remarks: string | null;
  createdAt: string;
  createdBy: UserSummary;
  voidedAt: string | null;
  voidReason: string | null;
  voidedBy: UserSummary | null;
  correctsEntryId: string | null;
}

export interface FireIncidentEvent {
  id: string;
  type: string;
  remarks: string | null;
  createdAt: string;
  actor: UserSummary;
}

export type IncidentImpact = Record<string, number | string | null>;
export type IncidentResources = Record<string, number | string | null>;
export interface IncidentPersonnel {
  groundCommander: string;
  arsonInvestigator: string;
  sender: string;
}

export interface FireIncidentDetail
  extends Omit<FireIncidentListItem, "location"> {
  officeId: string;
  dateTimeReported: string | null;
  dateTimeCallReceived: string | null;
  dateTimeUnresponded: string | null;
  remarks: string | null;
  categoryId: string;
  subcategoryId: string | null;
  createdBy: UserSummary;
  location: IncidentLocation;
  impact: IncidentImpact | null;
  resources: IncidentResources | null;
  personnel: IncidentPersonnel | null;
  timeline: TimelineEntry[];
  events: FireIncidentEvent[];
}

// ----- Forms (validated again by the backend) -----

const optionalNumber = z.number().optional().nullable();

export const timelineEntrySchema = z.object({
  status: z.enum(FIRE_INCIDENT_STATUSES),
  // "" keeps the alarm in effect at that time.
  alarmLevel: z.union([z.enum(ALARM_LEVELS), z.literal("NONE"), z.literal("")]),
  occurredAt: z.string().min(1, "When did it happen?"),
  remarks: z.string().max(1000).optional(),
});
export type TimelineEntryFormValues = z.infer<typeof timelineEntrySchema>;

const coordinates = {
  latitude: optionalNumber.refine(
    (value) => value == null || (value >= -90 && value <= 90),
    "Latitude must be between -90 and 90",
  ),
  longitude: optionalNumber.refine(
    (value) => value == null || (value >= -180 && value <= 180),
    "Longitude must be between -180 and 180",
  ),
};

const bothOrNeither = (values: {
  latitude?: number | null;
  longitude?: number | null;
}) => (values.latitude == null) === (values.longitude == null);

export const submitIncidentSchema = z
  .object({
    categoryId: z.string().min(1, "Select a category"),
    subcategoryId: z.string().optional(),
    placeOfOccurence: z.string().trim().min(1, "Place of occurrence is required"),
    barangay: z.string().trim().min(1, "Barangay is required"),
    ...coordinates,
    initialStatus: z.enum(FIRE_INCIDENT_STATUSES),
    initialAlarmLevel: z.union([z.enum(ALARM_LEVELS), z.literal("NONE")]),
    occurredAt: z.string().min(1, "When did it happen?"),
    dateTimeReported: z.string().optional(),
    dateTimeFireIncident: z.string().optional(),
    dateTimeCallReceived: z.string().optional(),
    remarks: z.string().max(2000).optional(),
  })
  .refine(bothOrNeither, {
    message: "Give both latitude and longitude, or neither",
    path: ["longitude"],
  });
export type SubmitIncidentFormValues = z.infer<typeof submitIncidentSchema>;

export const editIncidentSchema = z
  .object({
    categoryId: z.string().min(1, "Select a category"),
    subcategoryId: z.string().optional(),
    placeOfOccurence: z.string().trim().min(1, "Place of occurrence is required"),
    barangay: z.string().trim().min(1, "Barangay is required"),
    ...coordinates,
    dateTimeReported: z.string().optional(),
    dateTimeFireIncident: z.string().optional(),
    dateTimeCallReceived: z.string().optional(),
    dateTimeUnresponded: z.string().optional(),
    remarks: z.string().max(2000).optional(),
  })
  .refine(bothOrNeither, {
    message: "Give both latitude and longitude, or neither",
    path: ["longitude"],
  });
export type EditIncidentFormValues = z.infer<typeof editIncidentSchema>;

// ----- API payloads -----

export interface TimelineEntryPayload {
  status: FireIncidentStatus;
  alarmLevel?: FireAlarmLevel | null;
  occurredAt: string;
  remarks?: string;
}

export interface SubmitIncidentPayload {
  categoryId: string;
  subcategoryId?: string | null;
  dateTimeReported?: string | null;
  dateTimeFireIncident?: string | null;
  dateTimeCallReceived?: string | null;
  remarks?: string | null;
  location: {
    placeOfOccurence: string;
    barangay: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  initialEntry: TimelineEntryPayload;
}

export interface UpdateIncidentPayload {
  categoryId?: string;
  subcategoryId?: string | null;
  dateTimeReported?: string | null;
  dateTimeFireIncident?: string | null;
  dateTimeCallReceived?: string | null;
  dateTimeUnresponded?: string | null;
  remarks?: string | null;
  location?: {
    placeOfOccurence?: string;
    barangay?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  impact?: Record<string, number | null>;
  resources?: Record<string, number | string | null>;
  personnel?: IncidentPersonnel;
}

export interface FireIncidentListFilters {
  page: number;
  status?: FireIncidentStatus;
  approvalStatus?: IncidentApprovalStatus;
  search?: string;
}
