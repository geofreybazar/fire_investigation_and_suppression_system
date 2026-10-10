import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  CauseOfFire,
  FireCaseClassification,
  ReferralDirection,
  ReportDecision,
  ReportStatus,
} from '../../generated/prisma/enums.js';
import {
  INVESTIGATOR_ROLES,
  REPORT_EDITABLE_STATUSES,
  REVIEW_FROM,
} from './utils/investigation-rules.js';

// Users are only ever exposed by name.
const userSummary = {
  select: { id: true, rank: true, first_name: true, last_name: true },
} as const;

const officeSummary = {
  select: { id: true, name: true, type: true },
} as const;

// An investigation is open while it is assigned and its report not approved.
const open = { completedAt: null } as const;

export interface InvestigationDraft {
  investigation: {
    causeOfFire?: CauseOfFire | null;
    classification?: FireCaseClassification | null;
    originOfFire?: string | null;
  };
  report?: {
    findings?: string | null;
    cause?: string | null;
    conclusion?: string | null;
    recommendations?: string | null;
  };
}

@Injectable()
export class InvestigationRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findOfficeType(officeId: string) {
    return this.prismaService.office.findUnique({
      where: { id: officeId },
      select: { id: true, type: true },
    });
  }

  // The incident fields investigation decisions need, with its station's chain.
  async findIncident(incidentId: string) {
    return this.prismaService.fireIncident.findUnique({
      where: { id: incidentId },
      select: {
        id: true,
        incidentNo: true,
        officeId: true,
        approvalStatus: true,
        deletedAt: true,
        fireIncidentStatus: true,
        investigationHandlingOfficeId: true,
        office: {
          select: {
            id: true,
            name: true,
            type: true,
            parentId: true,
            regionId: true,
            parent: officeSummary,
            region: {
              select: {
                id: true,
                name: true,
                type: true,
                parent: officeSummary,
              },
            },
          },
        },
      },
    });
  }

  async findIncidentInvestigations(incidentId: string) {
    const [referrals, investigations] = await Promise.all([
      this.prismaService.investigationReferral.findMany({
        where: { fireIncidentId: incidentId },
        orderBy: { createdAt: 'asc' },
        include: {
          fromOffice: officeSummary,
          toOffice: officeSummary,
          referredBy: userSummary,
        },
      }),
      this.prismaService.investigation.findMany({
        where: { fireIncidentId: incidentId },
        orderBy: { startedAt: 'asc' },
        include: {
          conductingOffice: officeSummary,
          assignedInvestigator: userSummary,
          assignedBy: userSummary,
          report: { select: { status: true } },
        },
      }),
    ]);

    return { referrals, investigations };
  }

  // Active investigators of an office, for the chief to assign.
  async findInvestigators(officeId: string) {
    return this.prismaService.user.findMany({
      where: { officeId, isActive: true, role: { in: INVESTIGATOR_ROLES } },
      select: { ...userSummary.select, role: true },
      orderBy: { last_name: 'asc' },
    });
  }

  async findUser(userId: string) {
    return this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true, officeId: true },
    });
  }

  // Moves the case to another office. Returns false if, once locked, the case
  // has an open investigation or is no longer at `fromOfficeId`.
  async refer(
    incidentId: string,
    referral: {
      fromOfficeId: string;
      toOfficeId: string;
      direction: ReferralDirection;
      referredById: string;
      remarks?: string | null;
    },
  ) {
    return this.prismaService.$transaction(async (tx) => {
      if (
        !(await this.isUnchangedAndClosed(
          tx,
          incidentId,
          referral.fromOfficeId,
        ))
      ) {
        return false;
      }

      await tx.fireIncident.update({
        where: { id: incidentId },
        data: { investigationHandlingOfficeId: referral.toOfficeId },
      });
      await tx.investigationReferral.create({
        data: { fireIncidentId: incidentId, ...referral },
      });

      return true;
    });
  }

  // Starts (creates and assigns) an investigation. Returns null if, once
  // locked, the case has an open investigation or moved to another office.
  async start(
    incidentId: string,
    investigation: {
      incidentNo: string;
      conductingOfficeId: string;
      assignedInvestigatorId: string;
      assignedById: string;
    },
    numberFor: (existing: number) => string,
  ) {
    return this.prismaService.$transaction(async (tx) => {
      if (
        !(await this.isUnchangedAndClosed(
          tx,
          incidentId,
          investigation.conductingOfficeId,
        ))
      ) {
        return null;
      }

      const existing = await tx.investigation.count({
        where: { fireIncidentId: incidentId },
      });

      return tx.investigation.create({
        data: {
          investigationNo: numberFor(existing),
          fireIncidentId: incidentId,
          conductingOfficeId: investigation.conductingOfficeId,
          assignedInvestigatorId: investigation.assignedInvestigatorId,
          assignedById: investigation.assignedById,
          startedAt: new Date(),
        },
        select: { id: true, investigationNo: true },
      });
    });
  }

  // Investigation fields every access decision needs.
  async findForAccess(id: string) {
    return this.prismaService.investigation.findUnique({
      where: { id },
      select: {
        id: true,
        fireIncidentId: true,
        conductingOfficeId: true,
        assignedInvestigatorId: true,
        classification: true,
        causeOfFire: true,
        completedAt: true,
        report: { select: { status: true } },
        fireIncident: {
          select: {
            officeId: true,
            approvalStatus: true,
            deletedAt: true,
            office: { select: { id: true, parentId: true, regionId: true } },
          },
        },
      },
    });
  }

  async findDetail(id: string) {
    return this.prismaService.investigation.findUnique({
      where: { id },
      include: {
        fireIncident: {
          select: {
            id: true,
            incidentNo: true,
            fireIncidentStatus: true,
            office: officeSummary,
            location: true,
          },
        },
        conductingOffice: officeSummary,
        assignedInvestigator: userSummary,
        assignedBy: userSummary,
        report: {
          include: {
            reviewedBy: userSummary,
            reviews: {
              orderBy: { createdAt: 'asc' },
              include: { reviewer: userSummary },
            },
          },
        },
      },
    });
  }

  // Saves the investigator's draft. Returns false if the investigation is
  // completed or its report is no longer editable.
  async updateDraft(id: string, draft: InvestigationDraft) {
    return this.prismaService.$transaction(async (tx) => {
      const current = await tx.investigation.findUnique({
        where: { id },
        select: { completedAt: true, report: { select: { status: true } } },
      });

      if (
        !current ||
        current.completedAt !== null ||
        (current.report &&
          !REPORT_EDITABLE_STATUSES.includes(current.report.status))
      ) {
        return false;
      }

      await tx.investigation.update({
        where: { id },
        data: {
          ...draft.investigation,
          ...(draft.report && {
            report: {
              upsert: {
                create: { ...draft.report, status: ReportStatus.DRAFT },
                update: draft.report,
              },
            },
          }),
        },
      });

      return true;
    });
  }

  async submitReport(id: string) {
    const { count } = await this.prismaService.investigationReport.updateMany({
      where: {
        investigationId: id,
        status: { in: REPORT_EDITABLE_STATUSES },
        investigation: open,
      },
      data: { status: ReportStatus.SUBMITTED, submittedAt: new Date() },
    });

    return count > 0;
  }

  // Records a review decision. Approval also completes the investigation.
  // Returns false if the report is not in a state the decision applies to.
  async review(
    id: string,
    decision: ReportDecision,
    reviewerId: string,
    remarks?: string | null,
  ) {
    return this.prismaService.$transaction(async (tx) => {
      const report = await tx.investigationReport.findFirst({
        where: {
          investigationId: id,
          status: { in: REVIEW_FROM[decision] },
          investigation: open,
        },
        select: { id: true },
      });

      if (!report) {
        return false;
      }

      const now = new Date();

      await tx.investigationReport.update({
        where: { id: report.id },
        data: {
          // ReportDecision values are the matching ReportStatus values.
          status: decision as ReportStatus,
          reviewedAt: now,
          reviewedById: reviewerId,
        },
      });
      await tx.investigationReportReview.create({
        data: { reportId: report.id, decision, reviewerId, remarks },
      });

      if (decision === ReportDecision.APPROVED) {
        await tx.investigation.update({
          where: { id },
          data: { completedAt: now },
        });
      }

      return true;
    });
  }

  // Incidents waiting on an office's investigation decisions.
  async findQueue(officeId: string, skip: number, take: number) {
    const where: Prisma.FireIncidentWhereInput = {
      deletedAt: null,
      approvalStatus: 'APPROVED',
      OR: [
        { investigationHandlingOfficeId: officeId },
        { investigationHandlingOfficeId: null, officeId },
      ],
    };

    const [incidents, total] = await Promise.all([
      this.prismaService.fireIncident.findMany({
        where,
        select: {
          id: true,
          incidentNo: true,
          fireIncidentStatus: true,
          createdAt: true,
          office: officeSummary,
          location: {
            select: {
              placeOfOccurence: true,
              barangay: true,
              city_municipality: true,
            },
          },
          investigations: {
            orderBy: { startedAt: 'desc' },
            take: 1,
            select: {
              id: true,
              investigationNo: true,
              completedAt: true,
              report: { select: { status: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prismaService.fireIncident.count({ where }),
    ]);

    return { incidents, total };
  }

  async findAssigned(userId: string, skip: number, take: number) {
    const where: Prisma.InvestigationWhereInput = {
      assignedInvestigatorId: userId,
      fireIncident: { deletedAt: null },
    };

    const [investigations, total] = await Promise.all([
      this.prismaService.investigation.findMany({
        where,
        select: {
          id: true,
          investigationNo: true,
          startedAt: true,
          completedAt: true,
          conductingOffice: officeSummary,
          fireIncident: { select: { id: true, incidentNo: true } },
          report: { select: { status: true } },
        },
        orderBy: { startedAt: 'desc' },
        skip,
        take,
      }),
      this.prismaService.investigation.count({ where }),
    ]);

    return { investigations, total };
  }

  // Locks the incident, then confirms the case is still at `officeId`, the
  // incident isn't deleted, and no investigation is open.
  private async isUnchangedAndClosed(
    tx: Prisma.TransactionClient,
    incidentId: string,
    officeId: string,
  ) {
    await tx.$queryRaw`SELECT id FROM "FireIncident" WHERE id = ${incidentId} FOR UPDATE`;

    const incident = await tx.fireIncident.findUnique({
      where: { id: incidentId },
      select: {
        officeId: true,
        deletedAt: true,
        investigationHandlingOfficeId: true,
        _count: { select: { investigations: { where: open } } },
      },
    });

    return (
      !!incident &&
      incident.deletedAt === null &&
      (incident.investigationHandlingOfficeId ?? incident.officeId) ===
        officeId &&
      incident._count.investigations === 0
    );
  }
}
