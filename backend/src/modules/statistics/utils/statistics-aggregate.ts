import {
  CATEGORY_TYPE,
  CauseOfFire,
  FireAlarmLevel,
  FireCaseClassification,
  FireIncidentStatus,
  OfficeType,
} from '../../../generated/prisma/enums.js';

// Pure aggregation for the statistics endpoints (REQUIREMENTS.md Q-20).
// Callers pass only approved, non-deleted incidents within the viewer's scope.

interface NamedOffice {
  id: string;
  name: string;
}

// Decimal columns arrive as Prisma Decimal objects; anything with toString.
type DecimalLike = { toString(): string } | null;

export interface StatisticsIncident {
  id: string;
  fireIncidentStatus: FireIncidentStatus;
  currentAlarmLevel: FireAlarmLevel | null;
  dateTimeFireIncident: Date | null;
  createdAt: Date;
  office: NamedOffice & {
    parent: NamedOffice | null;
    region: NamedOffice | null;
  };
  category: { name: string; type: CATEGORY_TYPE };
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
    estimatedDamages: DecimalLike;
    finalEstimatedDamages: DecimalLike;
  } | null;
  // Has a non-voided REKINDLE timeline entry.
  rekindled: boolean;
  // The latest completed investigation, which is the one statistics use.
  latestInvestigation: {
    classification: FireCaseClassification | null;
    causeOfFire: CauseOfFire | null;
  } | null;
}

export interface Bucket {
  key: string;
  label: string;
  count: number;
}

const IMPACT_FIELDS = [
  'fatalitiesCiv',
  'injuredCiv',
  'fatalitiesBFP',
  'injuredBFP',
  'fatalitiesLEA',
  'injuredLEA',
  'establishmentsBurned',
  'familiesAffected',
  'individualsAffected',
] as const;

const ACTIVE_STATUSES: FireIncidentStatus[] = [
  FireIncidentStatus.ON_GOING,
  FireIncidentStatus.REKINDLE,
];

export const incidentDate = (incident: StatisticsIncident) =>
  incident.dateTimeFireIncident ?? incident.createdAt;

// YYYY-MM of a date in Philippine time, like the incident numbers.
export function manilaMonth(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  return `${year}-${month}`;
}

// Incidents are grouped by the offices directly below the viewer: regions
// for NHQ, districts/provinces for a region, stations below that.
export function officeGroup(
  incident: StatisticsIncident,
  viewerOfficeType: OfficeType,
): NamedOffice {
  const { office } = incident;

  switch (viewerOfficeType) {
    case OfficeType.NATIONAL_HEADQUARTERS:
      return office.region ?? office;
    case OfficeType.REGIONAL_OFFICE:
      return office.parent ?? office;
    default:
      return office;
  }
}

const label = (key: string) =>
  key
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

// Counts per key, largest first unless an order is given.
function countBy(
  incidents: StatisticsIncident[],
  keyOf: (
    incident: StatisticsIncident,
  ) => { key: string; label: string } | null,
  order?: string[],
): Bucket[] {
  const buckets = new Map<string, Bucket>();

  for (const incident of incidents) {
    const group = keyOf(incident);
    if (!group) continue;

    const bucket = buckets.get(group.key) ?? { ...group, count: 0 };
    bucket.count += 1;
    buckets.set(group.key, bucket);
  }

  const result = [...buckets.values()];

  if (order) {
    return result.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  }

  return result.sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );
}

const enumKey = (key: string) => ({ key, label: label(key) });

const toNumber = (value: DecimalLike) => (value ? Number(value.toString()) : 0);

export function summarize(
  incidents: StatisticsIncident[],
  viewerOfficeType: OfficeType,
) {
  const impact = Object.fromEntries(
    IMPACT_FIELDS.map((field) => [
      field,
      incidents.reduce(
        (sum, incident) => sum + (incident.impact?.[field] ?? 0),
        0,
      ),
    ]),
  ) as Record<(typeof IMPACT_FIELDS)[number], number>;

  const investigated = incidents.filter(
    (incident) => incident.latestInvestigation,
  );

  return {
    totals: {
      incidents: incidents.length,
      active: incidents.filter((incident) =>
        ACTIVE_STATUSES.includes(incident.fireIncidentStatus),
      ).length,
      // REKINDLE counts as its own category: incidents that rekindled at
      // least once, whatever their status now.
      rekindled: incidents.filter((incident) => incident.rekindled).length,
      investigated: investigated.length,
    },
    impact: {
      ...impact,
      estimatedDamages: incidents.reduce(
        (sum, incident) =>
          sum + toNumber(incident.impact?.estimatedDamages ?? null),
        0,
      ),
      finalEstimatedDamages: incidents.reduce(
        (sum, incident) =>
          sum + toNumber(incident.impact?.finalEstimatedDamages ?? null),
        0,
      ),
    },
    byStatus: countBy(
      incidents,
      (incident) => enumKey(incident.fireIncidentStatus),
      Object.values(FireIncidentStatus),
    ),
    byCategoryType: countBy(incidents, (incident) =>
      enumKey(incident.category.type),
    ),
    byCategory: countBy(incidents, (incident) => ({
      key: incident.category.name,
      label: incident.category.name,
    })),
    byAlarm: countBy(
      incidents,
      (incident) =>
        incident.currentAlarmLevel
          ? enumKey(incident.currentAlarmLevel)
          : { key: 'NONE', label: 'No alarm' },
      ['NONE', ...Object.values(FireAlarmLevel)],
    ),
    byMonth: countBy(incidents, (incident) => {
      const month = manilaMonth(incidentDate(incident));
      return { key: month, label: month };
    }).sort((a, b) => a.key.localeCompare(b.key)),
    byOffice: countBy(incidents, (incident) => {
      const office = officeGroup(incident, viewerOfficeType);
      return { key: office.id, label: office.name };
    }),
    byCause: countBy(investigated, (incident) =>
      incident.latestInvestigation?.causeOfFire
        ? enumKey(incident.latestInvestigation.causeOfFire)
        : null,
    ),
    byClassification: countBy(investigated, (incident) =>
      incident.latestInvestigation?.classification
        ? enumKey(incident.latestInvestigation.classification)
        : null,
    ),
  };
}

export type StatisticsSummary = ReturnType<typeof summarize>;
