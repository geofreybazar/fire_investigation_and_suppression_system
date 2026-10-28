import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  FireAlarmLevel,
  FireIncidentEventType,
  FireIncidentStatus,
  IncidentApprovalStatus,
} from '../../generated/prisma/enums.js';
import { generateIncidentNumber } from './utils/generate-incident-number.js';
import { recordAudit } from '../audit/audit.writer.js';

// The owning station and its region, for the audit entry's scope.
async function incidentScope(tx: Prisma.TransactionClient, id: string) {
  const incident = await tx.fireIncident.findUnique({
    where: { id },
    select: { officeId: true, office: { select: { regionId: true } } },
  });

  return {
    officeId: incident?.officeId ?? null,
    regionId: incident?.office.regionId ?? null,
  };
}

// Users are only ever exposed by name.
const userSummary = {
  select: { id: true, rank: true, first_name: true, last_name: true },
} as const;

const listSelect = {
  id: true,
  incidentNo: true,
  fireIncidentStatus: true,
  currentAlarmLevel: true,
  approvalStatus: true,
  dateTimeFireIncident: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true } },
  subcategory: { select: { id: true, name: true } },
  office: { select: { id: true, name: true } },
  location: {
    select: {
      placeOfOccurence: true,
      barangay: true,
      city_municipality: true,
      province_district: true,
      region: true,
    },
  },
} satisfies Prisma.FireIncidentSelect;

const timelineEntryState = {
  id: true,
  status: true,
  alarmLevel: true,
  occurredAt: true,
  createdAt: true,
  voidedAt: true,
} satisfies Prisma.IncidentTimelineSelect;

export interface NewTimelineEntry {
  status: FireIncidentStatus;
  alarmLevel: FireAlarmLevel | null;
  occurredAt: Date;
  remarks?: string | null;
}

export type TimelineEntryRow = Prisma.IncidentTimelineGetPayload<{
  select: typeof timelineEntryState;
}>;

// What a timeline change does, decided by the service from the locked entries.
export interface TimelineChange {
  voidEntry?: { id: string; reason: string };
  newEntry?: NewTimelineEntry;
  current: { status: FireIncidentStatus; alarmLevel: FireAlarmLevel | null };
}

export interface SubmittedIncident {
  officeId: string;
  createdById: string;
  categoryId: string;
  subcategoryId?: string | null;
  establishmentId?: string | null;
  dateTimeReported?: Date | null;
  dateTimeFireIncident?: Date | null;
  dateTimeCallReceived?: Date | null;
  dateTimeUnresponded?: Date | null;
  remarks?: string | null;
  location: Prisma.IncidentLocationCreateWithoutFireIncidentInput;
  initialEntry: NewTimelineEntry;
}

@Injectable()
export class FireIncidentRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findOfficeType(officeId: string) {
    return this.prismaService.office.findUnique({
      where: { id: officeId },
      select: { id: true, type: true },
    });
  }

  // The submitting station with the names its location is derived from.
  async findStationForSubmission(officeId: string) {
    return this.prismaService.office.findUnique({
      where: { id: officeId },
      select: {
        id: true,
        name: true,
        type: true,
        parent: { select: { name: true } },
        region: { select: { name: true } },
      },
    });
  }

  async findCategory(categoryId: string) {
    return this.prismaService.fireIncidentCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
  }

  async findSubcategory(subcategoryId: string) {
    return this.prismaService.fireIncidentSubcategory.findUnique({
      where: { id: subcategoryId },
      select: { id: true, categoryId: true },
    });
  }

  async findEstablishment(establishmentId: string) {
    return this.prismaService.establishment.findUnique({
      where: { id: establishmentId },
      select: { id: true },
    });
  }

  // Incident, location, first timeline entry and SUBMITTED event: one nested
  // write, so they are created together or not at all.
  async createSubmittedIncident(data: SubmittedIncident) {
    const { location, initialEntry, ...incident } = data;

    return this.prismaService.fireIncident.create({
      data: {
        ...incident,
        fireIncidentStatus: initialEntry.status,
        currentAlarmLevel: initialEntry.alarmLevel,
        approvalStatus: IncidentApprovalStatus.PENDING,
        location: { create: location },
        timeline: {
          create: { ...initialEntry, createdById: incident.createdById },
        },
        events: {
          create: {
            type: FireIncidentEventType.SUBMITTED,
            actorId: incident.createdById,
          },
        },
      },
      select: { id: true },
    });
  }

  async findPaginated(
    where: Prisma.FireIncidentWhereInput,
    skip: number,
    take: number,
  ) {
    const [incidents, total] = await Promise.all([
      this.prismaService.fireIncident.findMany({
        where,
        select: listSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prismaService.fireIncident.count({ where }),
    ]);

    return { incidents, total };
  }

  // The fields every access decision needs.
  async findForAccess(id: string) {
    return this.prismaService.fireIncident.findUnique({
      where: { id },
      select: {
        id: true,
        officeId: true,
        approvalStatus: true,
        deletedAt: true,
        categoryId: true,
        subcategoryId: true,
        location: { select: { latitude: true, longitude: true } },
        office: {
          select: {
            id: true,
            parentId: true,
            regionId: true,
            region: { select: { regionCode: true } },
          },
        },
      },
    });
  }

  async findDetail(id: string) {
    return this.prismaService.fireIncident.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, type: true } },
        subcategory: { select: { id: true, name: true } },
        establishment: true,
        office: { select: { id: true, name: true, type: true } },
        createdBy: userSummary,
        location: true,
        impact: true,
        resources: true,
        personnel: true,
        timeline: {
          orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }],
          include: { createdBy: userSummary, voidedBy: userSummary },
        },
        events: {
          orderBy: { createdAt: 'asc' },
          include: { actor: userSummary },
        },
      },
    });
  }

  async updateDetails(id: string, data: Prisma.FireIncidentUpdateInput) {
    return this.prismaService.fireIncident.update({
      where: { id },
      data,
      select: { id: true },
    });
  }

  // Changes approval state only if it is still `from`; returns false otherwise.
  async changeApprovalStatus(
    id: string,
    from: IncidentApprovalStatus,
    to: IncidentApprovalStatus,
    event: { type: FireIncidentEventType; actorId: string; remarks?: string },
  ) {
    return this.prismaService.$transaction(async (tx) => {
      const { count } = await tx.fireIncident.updateMany({
        where: { id, approvalStatus: from, deletedAt: null },
        data: { approvalStatus: to },
      });

      if (count === 0) {
        return false;
      }

      await tx.fireIncidentEvent.create({
        data: { fireIncidentId: id, ...event },
      });

      return true;
    });
  }

  // Approves a pending incident and assigns its number in the same
  // transaction; returns null if it is no longer pending.
  async approve(id: string, approverId: string, regionCode: string) {
    return this.prismaService.$transaction(async (tx) => {
      await this.lockIncident(tx, id);

      const incident = await tx.fireIncident.findUnique({
        where: { id },
        select: { approvalStatus: true, deletedAt: true },
      });

      if (
        !incident ||
        incident.deletedAt !== null ||
        incident.approvalStatus !== IncidentApprovalStatus.PENDING
      ) {
        return null;
      }

      const incidentNo = await generateIncidentNumber(tx, regionCode);

      await tx.fireIncident.update({
        where: { id },
        data: { approvalStatus: IncidentApprovalStatus.APPROVED, incidentNo },
      });
      await tx.fireIncidentEvent.create({
        data: {
          fireIncidentId: id,
          type: FireIncidentEventType.APPROVED,
          actorId: approverId,
        },
      });

      return { incidentNo };
    });
  }

  // Soft delete, only if not already deleted and (when given) still in the
  // expected approval state; returns false otherwise.
  async softDelete(
    id: string,
    actorId: string,
    eventType: FireIncidentEventType,
    deletion: { reason: string | null; memoReference?: string | null },
    requiredApprovalStatus?: IncidentApprovalStatus,
  ) {
    const memoReference = deletion.memoReference ?? null;

    return this.prismaService.$transaction(async (tx) => {
      const { count } = await tx.fireIncident.updateMany({
        where: {
          id,
          deletedAt: null,
          ...(requiredApprovalStatus && {
            approvalStatus: requiredApprovalStatus,
          }),
        },
        data: {
          deletedAt: new Date(),
          deletedById: actorId,
          deletionReason: deletion.reason,
          deletionMemoReference: memoReference,
        },
      });

      if (count === 0) {
        return false;
      }

      await tx.fireIncidentEvent.create({
        data: {
          fireIncidentId: id,
          type: eventType,
          actorId,
          // Restore clears the deletion fields, so the event keeps the memo.
          remarks: memoReference
            ? `Memo ${memoReference}: ${deletion.reason}`
            : deletion.reason,
        },
      });

      // A SUPER_ADMIN write (Q-23); staff removals stay in the event log only.
      if (eventType === FireIncidentEventType.DELETED) {
        await recordAudit(tx, {
          actorId,
          action: 'INCIDENT_DELETED',
          entityType: 'FIRE_INCIDENT',
          entityId: id,
          ...(await incidentScope(tx, id)),
          changes: { reason: deletion.reason, memoReference },
        });
      }

      return true;
    });
  }

  async restore(id: string, actorId: string) {
    return this.prismaService.$transaction(async (tx) => {
      const { count } = await tx.fireIncident.updateMany({
        where: { id, deletedAt: { not: null } },
        data: {
          deletedAt: null,
          deletedById: null,
          deletionReason: null,
          deletionMemoReference: null,
        },
      });

      if (count === 0) {
        return false;
      }

      await tx.fireIncidentEvent.create({
        data: {
          fireIncidentId: id,
          type: FireIncidentEventType.RESTORED,
          actorId,
        },
      });

      await recordAudit(tx, {
        actorId,
        action: 'INCIDENT_RESTORED',
        entityType: 'FIRE_INCIDENT',
        entityId: id,
        ...(await incidentScope(tx, id)),
      });

      return true;
    });
  }

  async findDeletedPaginated(skip: number, take: number) {
    const where: Prisma.FireIncidentWhereInput = { deletedAt: { not: null } };

    const [incidents, total] = await Promise.all([
      this.prismaService.fireIncident.findMany({
        where,
        select: {
          ...listSelect,
          deletedAt: true,
          deletionReason: true,
          deletionMemoReference: true,
          deletedBy: userSummary,
        },
        orderBy: { deletedAt: 'desc' },
        skip,
        take,
      }),
      this.prismaService.fireIncident.count({ where }),
    ]);

    return { incidents, total };
  }

  // Locks the incident, hands its timeline to `plan`, then applies the change
  // and the recomputed current status in the same transaction. Returns null
  // if the incident is deleted or missing.
  async changeTimeline(
    id: string,
    actorId: string,
    plan: (context: {
      entries: TimelineEntryRow[];
      investigationCount: number;
    }) => TimelineChange,
  ) {
    return this.prismaService.$transaction(async (tx) => {
      await this.lockIncident(tx, id);

      const incident = await tx.fireIncident.findUnique({
        where: { id },
        select: {
          deletedAt: true,
          timeline: { select: timelineEntryState },
          _count: { select: { investigations: true } },
        },
      });

      if (!incident || incident.deletedAt !== null) {
        return null;
      }

      const change = plan({
        entries: incident.timeline,
        investigationCount: incident._count.investigations,
      });

      if (change.voidEntry) {
        await tx.incidentTimeline.update({
          where: { id: change.voidEntry.id },
          data: {
            voidedAt: new Date(),
            voidedById: actorId,
            voidReason: change.voidEntry.reason,
          },
        });
      }

      const created = change.newEntry
        ? await tx.incidentTimeline.create({
            data: {
              ...change.newEntry,
              fireIncidentId: id,
              createdById: actorId,
              correctsEntryId: change.voidEntry?.id,
            },
            select: { id: true },
          })
        : null;

      await tx.fireIncident.update({
        where: { id },
        data: {
          fireIncidentStatus: change.current.status,
          currentAlarmLevel: change.current.alarmLevel,
        },
      });

      return { entryId: created?.id ?? null, current: change.current };
    });
  }

  // Serializes concurrent changes to one incident.
  private async lockIncident(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT id FROM "FireIncident" WHERE id = ${id} FOR UPDATE`;
  }
}
