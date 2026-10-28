import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { IncidentApprovalStatus } from '../../generated/prisma/enums.js';
import { CurrentUserJwtPayload } from '../../types/jwt.payload.js';
import { incidentScopeWhere } from '../fire-incident/utils/incident-scope.js';
import {
  StatisticsRepository,
  type ReportIncident,
} from './statistics.repository.js';
import {
  type ReportQuery,
  type StatisticsQuery,
} from './schema/statistics.schema.js';
import { summarize } from './utils/statistics-aggregate.js';
import { toCsv } from './utils/csv.js';

const REPORT_PAGE_SIZE = 20;

// A CSV export is a report, not a backup: beyond this many rows, narrow the
// filters. The response says when it was cut off.
export const CSV_ROW_LIMIT = 10_000;

const CSV_HEADERS = [
  'Incident No.',
  'Incident date',
  'Status',
  'Alarm level',
  'Category type',
  'Category',
  'Subcategory',
  'Place of occurrence',
  'Barangay',
  'City/Municipality',
  'Province/District',
  'Region',
  'Station',
  'Civilian fatalities',
  'Civilian injured',
  'BFP fatalities',
  'BFP injured',
  'Families affected',
  'Estimated damages (PHP)',
  'Classification',
  'Cause of fire',
];

@Injectable()
export class StatisticsService {
  constructor(private readonly statisticsRepository: StatisticsRepository) {}

  async summary(query: StatisticsQuery, user: CurrentUserJwtPayload) {
    const { where, officeType } = await this.scopedWhere(query, user);
    const incidents = await this.statisticsRepository.findForSummary(where);

    return summarize(incidents, officeType);
  }

  async reportPage(query: ReportQuery, user: CurrentUserJwtPayload) {
    const { where } = await this.scopedWhere(query, user);
    const skip = (query.page - 1) * REPORT_PAGE_SIZE;
    const { incidents, total } = await this.statisticsRepository.findReportPage(
      where,
      skip,
      REPORT_PAGE_SIZE,
    );

    return {
      data: incidents.map(toReportRow),
      pagination: {
        page: query.page,
        limit: REPORT_PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / REPORT_PAGE_SIZE),
      },
    };
  }

  async reportCsv(query: StatisticsQuery, user: CurrentUserJwtPayload) {
    const { where } = await this.scopedWhere(query, user);
    // One extra row tells whether the limit cut the export short.
    const incidents = await this.statisticsRepository.findReportRows(
      where,
      CSV_ROW_LIMIT + 1,
    );
    const truncated = incidents.length > CSV_ROW_LIMIT;

    const rows = incidents.slice(0, CSV_ROW_LIMIT).map((incident) => {
      const row = toReportRow(incident);
      return [
        row.incidentNo,
        row.incidentDate,
        row.status,
        row.alarmLevel,
        row.categoryType,
        row.category,
        row.subcategory,
        row.placeOfOccurence,
        row.barangay,
        row.cityMunicipality,
        row.provinceDistrict,
        row.region,
        row.station,
        row.fatalitiesCiv,
        row.injuredCiv,
        row.fatalitiesBFP,
        row.injuredBFP,
        row.familiesAffected,
        row.estimatedDamages,
        row.classification,
        row.causeOfFire,
      ];
    });

    return { csv: toCsv(CSV_HEADERS, rows), truncated };
  }

  async mapPoints(query: StatisticsQuery, user: CurrentUserJwtPayload) {
    const { where } = await this.scopedWhere(query, user);
    const incidents = await this.statisticsRepository.findMapPoints(where);

    return incidents.map((incident) => ({
      id: incident.id,
      incidentNo: incident.incidentNo,
      status: incident.fireIncidentStatus,
      alarmLevel: incident.currentAlarmLevel,
      incidentDate: incident.dateTimeFireIncident ?? incident.createdAt,
      category: incident.category.name,
      latitude: Number(incident.location?.latitude),
      longitude: Number(incident.location?.longitude),
      place: incident.location
        ? `${incident.location.placeOfOccurence}, ${incident.location.barangay}, ${incident.location.city_municipality}`
        : null,
    }));
  }

  // Approved, non-deleted incidents within the viewer's scope (Q-20): even
  // the station operations group's pending and rejected incidents are left
  // out of statistics.
  private async scopedWhere(
    query: StatisticsQuery,
    user: CurrentUserJwtPayload,
  ) {
    const office = await this.statisticsRepository.findOfficeType(
      user.officeId,
    );

    if (!office) {
      throw new ForbiddenException('Your office was not found.');
    }

    const range =
      query.from || query.to
        ? {
            ...(query.from && { gte: query.from }),
            ...(query.to && { lte: query.to }),
          }
        : undefined;

    const where: Prisma.FireIncidentWhereInput = {
      AND: [
        incidentScopeWhere({ user, officeType: office.type }),
        { approvalStatus: IncidentApprovalStatus.APPROVED },
        {
          ...(query.status && { fireIncidentStatus: query.status }),
          ...(query.categoryType && {
            category: { type: query.categoryType },
          }),
          // The fire's date, or the recording date when it was left blank.
          ...(range && {
            OR: [
              { dateTimeFireIncident: range },
              { dateTimeFireIncident: null, createdAt: range },
            ],
          }),
        },
      ],
    };

    return { where, officeType: office.type };
  }
}

function toReportRow(incident: ReportIncident) {
  const investigation = incident.investigations[0] ?? null;

  return {
    id: incident.id,
    incidentNo: incident.incidentNo,
    incidentDate: incident.dateTimeFireIncident ?? incident.createdAt,
    status: incident.fireIncidentStatus,
    alarmLevel: incident.currentAlarmLevel,
    categoryType: incident.category.type,
    category: incident.category.name,
    subcategory: incident.subcategory?.name ?? null,
    placeOfOccurence: incident.location?.placeOfOccurence ?? null,
    barangay: incident.location?.barangay ?? null,
    cityMunicipality: incident.location?.city_municipality ?? null,
    provinceDistrict: incident.location?.province_district ?? null,
    region: incident.location?.region ?? null,
    station: incident.office.name,
    fatalitiesCiv: incident.impact?.fatalitiesCiv ?? 0,
    injuredCiv: incident.impact?.injuredCiv ?? 0,
    fatalitiesBFP: incident.impact?.fatalitiesBFP ?? 0,
    injuredBFP: incident.impact?.injuredBFP ?? 0,
    familiesAffected: incident.impact?.familiesAffected ?? 0,
    estimatedDamages: incident.impact?.estimatedDamages
      ? Number(incident.impact.estimatedDamages.toString())
      : null,
    classification: investigation?.classification ?? null,
    causeOfFire: investigation?.causeOfFire ?? null,
  };
}
