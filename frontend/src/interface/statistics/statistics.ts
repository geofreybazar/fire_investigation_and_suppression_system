import type { Pagination } from "../pagination";
import type {
  FireAlarmLevel,
  FireIncidentStatus,
} from "@/constants/fireIncident";

// Mirrors backend/src/modules/statistics (REQUIREMENTS.md Q-20).

export const CATEGORY_TYPES = [
  "STRUCTURAL",
  "NON_STRUCTURAL",
  "TRANSPORTATION",
  "WILDLAND",
] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export interface StatisticsFilters {
  // ISO timestamps bounding the incident date.
  from?: string;
  to?: string;
  status?: FireIncidentStatus;
  categoryType?: CategoryType;
}

export interface Bucket {
  key: string;
  label: string;
  count: number;
}

export interface StatisticsSummary {
  totals: {
    incidents: number;
    active: number;
    rekindled: number;
    investigated: number;
  };
  impact: {
    fatalitiesCiv: number;
    injuredCiv: number;
    fatalitiesBFP: number;
    injuredBFP: number;
    fatalitiesLEA: number;
    injuredLEA: number;
    establishmentsBurned: number;
    familiesAffected: number;
    individualsAffected: number;
    estimatedDamages: number;
    finalEstimatedDamages: number;
  };
  byStatus: Bucket[];
  byCategoryType: Bucket[];
  byCategory: Bucket[];
  byAlarm: Bucket[];
  byMonth: Bucket[];
  byOffice: Bucket[];
  byCause: Bucket[];
  byClassification: Bucket[];
}

export interface IncidentReportRow {
  id: string;
  incidentNo: string | null;
  incidentDate: string;
  status: FireIncidentStatus;
  alarmLevel: FireAlarmLevel | null;
  categoryType: CategoryType;
  category: string;
  subcategory: string | null;
  placeOfOccurence: string | null;
  barangay: string | null;
  cityMunicipality: string | null;
  provinceDistrict: string | null;
  region: string | null;
  station: string;
  fatalitiesCiv: number;
  injuredCiv: number;
  fatalitiesBFP: number;
  injuredBFP: number;
  familiesAffected: number;
  estimatedDamages: number | null;
  classification: string | null;
  causeOfFire: string | null;
}

export interface PaginatedIncidentReport {
  data: IncidentReportRow[];
  pagination: Pagination;
}

export interface MapPoint {
  id: string;
  incidentNo: string | null;
  status: FireIncidentStatus;
  alarmLevel: FireAlarmLevel | null;
  incidentDate: string;
  category: string;
  latitude: number;
  longitude: number;
  place: string | null;
}
