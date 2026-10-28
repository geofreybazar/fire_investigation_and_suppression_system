import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { FireIncidentStatus } from '../../generated/prisma/enums.js';

const namedOffice = { select: { id: true, name: true } } as const;

// The latest completed investigation is the one statistics use (FR-INV-019).
const latestInvestigation = {
  where: { completedAt: { not: null } },
  orderBy: { completedAt: 'desc' },
  take: 1,
  select: { classification: true, causeOfFire: true },
} as const;

@Injectable()
export class StatisticsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findOfficeType(officeId: string) {
    return this.prismaService.office.findUnique({
      where: { id: officeId },
      select: { id: true, type: true },
    });
  }

  async findForSummary(where: Prisma.FireIncidentWhereInput) {
    const incidents = await this.prismaService.fireIncident.findMany({
      where,
      select: {
        id: true,
        fireIncidentStatus: true,
        currentAlarmLevel: true,
        dateTimeFireIncident: true,
        createdAt: true,
        office: {
          select: {
            id: true,
            name: true,
            parent: namedOffice,
            region: namedOffice,
          },
        },
        category: { select: { name: true, type: true } },
        impact: {
          select: {
            fatalitiesCiv: true,
            injuredCiv: true,
            fatalitiesBFP: true,
            injuredBFP: true,
            fatalitiesLEA: true,
            injuredLEA: true,
            establishmentsBurned: true,
            familiesAffected: true,
            individualsAffected: true,
            estimatedDamages: true,
            finalEstimatedDamages: true,
          },
        },
        _count: {
          select: {
            timeline: {
              where: { status: FireIncidentStatus.REKINDLE, voidedAt: null },
            },
          },
        },
        investigations: latestInvestigation,
      },
    });

    return incidents.map(({ _count, investigations, ...incident }) => ({
      ...incident,
      rekindled: _count.timeline > 0,
      latestInvestigation: investigations[0] ?? null,
    }));
  }

  private readonly reportSelect = {
    id: true,
    incidentNo: true,
    fireIncidentStatus: true,
    currentAlarmLevel: true,
    dateTimeFireIncident: true,
    createdAt: true,
    office: { select: { name: true } },
    category: { select: { name: true, type: true } },
    subcategory: { select: { name: true } },
    location: {
      select: {
        placeOfOccurence: true,
        barangay: true,
        city_municipality: true,
        province_district: true,
        region: true,
      },
    },
    impact: {
      select: {
        fatalitiesCiv: true,
        injuredCiv: true,
        fatalitiesBFP: true,
        injuredBFP: true,
        familiesAffected: true,
        estimatedDamages: true,
      },
    },
    investigations: latestInvestigation,
  } satisfies Prisma.FireIncidentSelect;

  // Newest incidents first.
  private readonly reportOrder: Prisma.FireIncidentOrderByWithRelationInput[] =
    [
      { dateTimeFireIncident: { sort: 'desc', nulls: 'last' } },
      { createdAt: 'desc' },
    ];

  async findReportPage(
    where: Prisma.FireIncidentWhereInput,
    skip: number,
    take: number,
  ) {
    const [incidents, total] = await Promise.all([
      this.prismaService.fireIncident.findMany({
        where,
        select: this.reportSelect,
        orderBy: this.reportOrder,
        skip,
        take,
      }),
      this.prismaService.fireIncident.count({ where }),
    ]);

    return { incidents, total };
  }

  async findReportRows(where: Prisma.FireIncidentWhereInput, take: number) {
    return this.prismaService.fireIncident.findMany({
      where,
      select: this.reportSelect,
      orderBy: this.reportOrder,
      take,
    });
  }

  // Incidents with coordinates, for the map.
  async findMapPoints(where: Prisma.FireIncidentWhereInput) {
    return this.prismaService.fireIncident.findMany({
      where: {
        AND: [
          where,
          {
            location: {
              latitude: { not: null },
              longitude: { not: null },
            },
          },
        ],
      },
      select: {
        id: true,
        incidentNo: true,
        fireIncidentStatus: true,
        currentAlarmLevel: true,
        dateTimeFireIncident: true,
        createdAt: true,
        category: { select: { name: true } },
        location: {
          select: {
            latitude: true,
            longitude: true,
            placeOfOccurence: true,
            barangay: true,
            city_municipality: true,
          },
        },
      },
    });
  }
}

export type ReportIncident = Awaited<
  ReturnType<StatisticsRepository['findReportRows']>
>[number];
