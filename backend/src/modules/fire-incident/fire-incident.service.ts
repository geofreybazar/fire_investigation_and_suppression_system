import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import {
  FireAlarmLevel,
  FireIncidentEventType,
  FireIncidentStatus,
  IncidentApprovalStatus,
  OfficeType,
  ROLE,
} from '../../generated/prisma/enums.js';
import { CurrentUserJwtPayload } from '../../types/jwt.payload.js';
import {
  FireIncidentRepository,
  type NewTimelineEntry,
  type TimelineChange,
  type TimelineEntryRow,
} from './fire-incident.repository.js';
import {
  type CorrectTimelineEntryInput,
  type CreateFireIncidentInput,
  type DeleteFireIncidentInput,
  type ListFireIncidentsQuery,
  type RejectFireIncidentInput,
  type TimelineEntryInput,
  type UpdateFireIncidentInput,
  type VoidTimelineEntryInput,
} from './schema/fire-incident.schema.js';
import {
  assertValidTimeline,
  currentTimelineState,
  sortTimeline,
  type TimelineEntryState,
} from './utils/incident-rules.js';
import {
  INCIDENT_EDITOR_ROLES,
  incidentScopeWhere,
  isIncidentVisible,
  type ViewerScope,
} from './utils/incident-scope.js';

const PAGE_SIZE = 10;

const STATION_TYPES: OfficeType[] = [
  OfficeType.CITY_FIRE_STATION,
  OfficeType.MUNICIPAL_FIRE_STATION,
];

// Statuses an investigation depends on; a correction may not move an
// investigated incident out of them.
const INVESTIGABLE_STATUSES: FireIncidentStatus[] = [
  FireIncidentStatus.FIRE_OUT,
  FireIncidentStatus.FIRE_OUT_UPON_ARRIVAL,
];

type AccessIncident = NonNullable<
  Awaited<ReturnType<FireIncidentRepository['findForAccess']>>
>;

@Injectable()
export class FireIncidentService {
  private readonly logger = new Logger(FireIncidentService.name);

  constructor(
    private readonly fireIncidentRepository: FireIncidentRepository,
  ) {}

  // ----- Submit, list and view (3.2) -----

  async submit(input: CreateFireIncidentInput, user: CurrentUserJwtPayload) {
    const station = await this.fireIncidentRepository.findStationForSubmission(
      user.officeId,
    );

    if (!station || !STATION_TYPES.includes(station.type)) {
      throw new ForbiddenException(
        'Only users of a city or municipal fire station can submit incidents.',
      );
    }

    if (!station.parent || !station.region) {
      throw new BadRequestException(
        'Your station is missing its district/province or regional office.',
      );
    }

    await this.assertValidClassification(input.categoryId, input.subcategoryId);
    await this.assertEstablishmentExists(input.establishmentId);

    const initialEntry: NewTimelineEntry = {
      status: input.initialEntry.status,
      alarmLevel: input.initialEntry.alarmLevel ?? null,
      occurredAt: input.initialEntry.occurredAt,
      remarks: input.initialEntry.remarks,
    };
    assertValidTimeline([{ ...initialEntry, createdAt: new Date() }]);

    const { location, initialEntry: _entry, ...details } = input;

    const incident = await this.fireIncidentRepository.createSubmittedIncident({
      ...details,
      officeId: station.id,
      createdById: user.sub,
      location: {
        placeOfOccurence: location.placeOfOccurence,
        barangay: location.barangay,
        latitude: location.latitude ?? null,
        longitude: location.longitude ?? null,
        // Derived from the station's office hierarchy, never from the client.
        city_municipality: station.name,
        province_district: station.parent.name,
        region: station.region.name,
      },
      initialEntry,
    });

    this.logger.log(`Fire incident submitted: ${incident.id}`);

    return incident;
  }

  async findPaginated(
    query: ListFireIncidentsQuery,
    user: CurrentUserJwtPayload,
  ) {
    const scope = await this.viewerScope(user);

    const where: Prisma.FireIncidentWhereInput = {
      AND: [
        incidentScopeWhere(scope),
        {
          ...(query.status && { fireIncidentStatus: query.status }),
          ...(query.approvalStatus && {
            approvalStatus: query.approvalStatus,
          }),
          ...(query.categoryId && { categoryId: query.categoryId }),
          ...(query.search && {
            incidentNo: { contains: query.search, mode: 'insensitive' },
          }),
          ...((query.from || query.to) && {
            createdAt: {
              ...(query.from && { gte: query.from }),
              ...(query.to && { lte: query.to }),
            },
          }),
        },
      ],
    };

    const skip = (query.page - 1) * PAGE_SIZE;
    const { incidents, total } =
      await this.fireIncidentRepository.findPaginated(where, skip, PAGE_SIZE);

    return this.page(incidents, total, query.page);
  }

  async findOne(id: string, user: CurrentUserJwtPayload) {
    await this.findVisible(id, user);

    return this.fireIncidentRepository.findDetail(id);
  }

  // ----- Approval, resubmission and staff removal (3.3) -----

  async approve(id: string, user: CurrentUserJwtPayload) {
    const incident = await this.findVisible(id, user);
    this.assertStationChief(incident, user);

    const regionCode = incident.office.region?.regionCode;

    if (!regionCode) {
      throw new BadRequestException(
        "The station's regional office has no region code; an admin must set it before incidents can be approved.",
      );
    }

    const result = await this.fireIncidentRepository.approve(
      id,
      user.sub,
      regionCode,
    );

    if (!result) {
      throw new ConflictException('Only a pending incident can be approved.');
    }

    this.logger.log(`Fire incident approved: ${id}`);

    return result;
  }

  async reject(
    id: string,
    input: RejectFireIncidentInput,
    user: CurrentUserJwtPayload,
  ) {
    const incident = await this.findVisible(id, user);
    this.assertStationChief(incident, user);

    const changed = await this.fireIncidentRepository.changeApprovalStatus(
      id,
      IncidentApprovalStatus.PENDING,
      IncidentApprovalStatus.REJECTED,
      {
        type: FireIncidentEventType.REJECTED,
        actorId: user.sub,
        remarks: input.remarks,
      },
    );

    if (!changed) {
      throw new ConflictException('Only a pending incident can be rejected.');
    }

    return { message: 'Fire incident rejected.' };
  }

  async resubmit(id: string, user: CurrentUserJwtPayload) {
    const incident = await this.findVisible(id, user);
    this.assertStationEditor(incident, user);

    const changed = await this.fireIncidentRepository.changeApprovalStatus(
      id,
      IncidentApprovalStatus.REJECTED,
      IncidentApprovalStatus.PENDING,
      { type: FireIncidentEventType.RESUBMITTED, actorId: user.sub },
    );

    if (!changed) {
      throw new ConflictException(
        'Only a rejected incident can be resubmitted.',
      );
    }

    return { message: 'Fire incident resubmitted.' };
  }

  // Staff remove their own rejected incidents; SUPER_ADMIN deletes the rest (3.6).
  async remove(
    id: string,
    input: DeleteFireIncidentInput,
    user: CurrentUserJwtPayload,
  ) {
    if (user.role === ROLE.SUPER_ADMIN) {
      return this.deleteAsSuperAdmin(id, input, user);
    }

    const incident = await this.findVisible(id, user);
    this.assertStationEditor(incident, user);

    if (incident.approvalStatus !== IncidentApprovalStatus.REJECTED) {
      throw new ForbiddenException(
        'Only a rejected incident that was never approved can be removed.',
      );
    }

    const removed = await this.fireIncidentRepository.softDelete(
      id,
      user.sub,
      FireIncidentEventType.REMOVED,
      input.reason ?? null,
      IncidentApprovalStatus.REJECTED,
    );

    if (!removed) {
      throw new ConflictException('The incident can no longer be removed.');
    }

    return { message: 'Fire incident removed.' };
  }

  // ----- Timeline (3.4) -----

  async addTimelineEntry(
    id: string,
    input: TimelineEntryInput,
    user: CurrentUserJwtPayload,
  ) {
    const incident = await this.findVisible(id, user);
    this.assertStationEditor(incident, user);

    return this.applyTimelineChange(id, user, ({ entries }) => {
      const newEntry = this.toNewEntry(input, entries);
      const next = [...this.toStates(entries), this.toState(newEntry)];

      assertValidTimeline(next);

      return { newEntry, current: currentTimelineState(next) };
    });
  }

  async voidTimelineEntry(
    id: string,
    entryId: string,
    input: VoidTimelineEntryInput,
    user: CurrentUserJwtPayload,
  ) {
    const incident = await this.findVisible(id, user);
    this.assertStationEditor(incident, user);

    return this.applyTimelineChange(
      id,
      user,
      ({ entries, investigationCount }) => {
        this.findActiveEntry(entries, entryId);

        const next = this.toStates(entries).map((state, i) =>
          entries[i].id === entryId ? { ...state, voided: true } : state,
        );

        assertValidTimeline(next);
        const current = currentTimelineState(next);
        this.assertInvestigationKeepsStatus(
          entries,
          current,
          investigationCount,
        );

        return { voidEntry: { id: entryId, reason: input.reason }, current };
      },
    );
  }

  async correctTimelineEntry(
    id: string,
    entryId: string,
    input: CorrectTimelineEntryInput,
    user: CurrentUserJwtPayload,
  ) {
    const incident = await this.findVisible(id, user);
    this.assertStationEditor(incident, user);

    return this.applyTimelineChange(
      id,
      user,
      ({ entries, investigationCount }) => {
        this.findActiveEntry(entries, entryId);

        const remaining = entries.filter((entry) => entry.id !== entryId);
        const newEntry = this.toNewEntry(input.entry, remaining);
        const next = [
          ...this.toStates(entries).map((state, i) =>
            entries[i].id === entryId ? { ...state, voided: true } : state,
          ),
          this.toState(newEntry),
        ];

        assertValidTimeline(next);
        const current = currentTimelineState(next);
        this.assertInvestigationKeepsStatus(
          entries,
          current,
          investigationCount,
        );

        return {
          voidEntry: { id: entryId, reason: input.reason },
          newEntry,
          current,
        };
      },
    );
  }

  // ----- Details (3.5) -----

  async updateDetails(
    id: string,
    input: UpdateFireIncidentInput,
    user: CurrentUserJwtPayload,
  ) {
    const incident = await this.findVisible(id, user);
    this.assertStationEditor(incident, user);

    // Validate the classification as it will be after the update.
    if (input.categoryId !== undefined || input.subcategoryId !== undefined) {
      const categoryId = input.categoryId ?? incident.categoryId;
      const subcategoryId =
        input.subcategoryId === undefined
          ? incident.subcategoryId
          : input.subcategoryId;

      await this.assertValidClassification(categoryId, subcategoryId);
    }

    await this.assertEstablishmentExists(input.establishmentId);

    // Coordinates are validated as a pair by the request schema.
    const { location, impact, resources, personnel, ...details } = input;

    const data: Prisma.FireIncidentUpdateInput = {
      ...this.withoutUndefined({
        dateTimeReported: details.dateTimeReported,
        dateTimeFireIncident: details.dateTimeFireIncident,
        dateTimeCallReceived: details.dateTimeCallReceived,
        dateTimeUnresponded: details.dateTimeUnresponded,
        remarks: details.remarks,
      }),
      ...(details.categoryId && {
        category: { connect: { id: details.categoryId } },
      }),
      ...(details.subcategoryId !== undefined && {
        subcategory: details.subcategoryId
          ? { connect: { id: details.subcategoryId } }
          : { disconnect: true },
      }),
      ...(details.establishmentId !== undefined && {
        establishment: details.establishmentId
          ? { connect: { id: details.establishmentId } }
          : { disconnect: true },
      }),
      ...(location && {
        location: { update: this.withoutUndefined(location) },
      }),
      ...(impact && { impact: { upsert: { create: impact, update: impact } } }),
      ...(resources && {
        resources: { upsert: { create: resources, update: resources } },
      }),
      ...(personnel && {
        personnel: { upsert: { create: personnel, update: personnel } },
      }),
    };

    return this.fireIncidentRepository.updateDetails(id, data);
  }

  // ----- SUPER_ADMIN deletion and restore (3.6) -----

  async findDeleted(page: number) {
    const skip = (page - 1) * PAGE_SIZE;
    const { incidents, total } =
      await this.fireIncidentRepository.findDeletedPaginated(skip, PAGE_SIZE);

    return this.page(incidents, total, page);
  }

  async restore(id: string, user: CurrentUserJwtPayload) {
    const restored = await this.fireIncidentRepository.restore(id, user.sub);

    if (!restored) {
      throw new NotFoundException('Deleted fire incident not found.');
    }

    this.logger.log(`Fire incident restored: ${id}`);

    return { message: 'Fire incident restored.' };
  }

  private async deleteAsSuperAdmin(
    id: string,
    input: DeleteFireIncidentInput,
    user: CurrentUserJwtPayload,
  ) {
    if (!input.reason) {
      throw new BadRequestException(
        'A reason (the memo reference and its approval) is required.',
      );
    }

    await this.findVisible(id, user);

    const deleted = await this.fireIncidentRepository.softDelete(
      id,
      user.sub,
      FireIncidentEventType.DELETED,
      input.reason,
    );

    if (!deleted) {
      throw new NotFoundException('Fire incident not found.');
    }

    this.logger.log(`Fire incident deleted: ${id}`);

    return { message: 'Fire incident deleted.' };
  }

  // ----- Shared checks -----

  private async viewerScope(user: CurrentUserJwtPayload): Promise<ViewerScope> {
    const office = await this.fireIncidentRepository.findOfficeType(
      user.officeId,
    );

    if (!office) {
      throw new ForbiddenException('Your office was not found.');
    }

    return { user, officeType: office.type };
  }

  // Loads an incident the user may see. Anything outside their scope is a 404,
  // so its existence isn't revealed.
  private async findVisible(
    id: string,
    user: CurrentUserJwtPayload,
  ): Promise<AccessIncident> {
    const scope = await this.viewerScope(user);
    const incident = await this.fireIncidentRepository.findForAccess(id);

    if (!incident || !isIncidentVisible(incident, scope)) {
      throw new NotFoundException('Fire incident not found.');
    }

    return incident;
  }

  private assertStationEditor(
    incident: AccessIncident,
    user: CurrentUserJwtPayload,
  ): void {
    if (
      !INCIDENT_EDITOR_ROLES.includes(user.role) ||
      incident.officeId !== user.officeId
    ) {
      throw new ForbiddenException(
        "Only the station's operation staff and COMMEL can change this incident.",
      );
    }
  }

  private assertStationChief(
    incident: AccessIncident,
    user: CurrentUserJwtPayload,
  ): void {
    if (
      user.role !== ROLE.CITY_MUNICIPALITY_OPERATION ||
      incident.officeId !== user.officeId
    ) {
      throw new ForbiddenException(
        "Only the station's chief of operations can approve or reject this incident.",
      );
    }
  }

  private async assertValidClassification(
    categoryId: string,
    subcategoryId?: string | null,
  ): Promise<void> {
    const category = await this.fireIncidentRepository.findCategory(categoryId);

    if (!category) {
      throw new BadRequestException('The incident category does not exist.');
    }

    if (subcategoryId) {
      const subcategory =
        await this.fireIncidentRepository.findSubcategory(subcategoryId);

      if (!subcategory || subcategory.categoryId !== categoryId) {
        throw new BadRequestException(
          'The subcategory does not belong to the selected category.',
        );
      }
    }
  }

  private async assertEstablishmentExists(
    establishmentId?: string | null,
  ): Promise<void> {
    if (
      establishmentId &&
      !(await this.fireIncidentRepository.findEstablishment(establishmentId))
    ) {
      throw new BadRequestException('The establishment does not exist.');
    }
  }

  private async applyTimelineChange(
    id: string,
    user: CurrentUserJwtPayload,
    plan: (context: {
      entries: TimelineEntryRow[];
      investigationCount: number;
    }) => TimelineChange,
  ) {
    const result = await this.fireIncidentRepository.changeTimeline(
      id,
      user.sub,
      plan,
    );

    if (!result) {
      throw new NotFoundException('Fire incident not found.');
    }

    return result;
  }

  private findActiveEntry(entries: TimelineEntryRow[], entryId: string) {
    const entry = entries.find((candidate) => candidate.id === entryId);

    if (!entry) {
      throw new NotFoundException('Timeline entry not found.');
    }

    if (entry.voidedAt !== null) {
      throw new ConflictException('The timeline entry is already voided.');
    }

    return entry;
  }

  // An omitted alarm means "unchanged": the alarm in effect at that event time.
  private toNewEntry(
    input: TimelineEntryInput,
    entries: TimelineEntryRow[],
  ): NewTimelineEntry {
    let alarmLevel: FireAlarmLevel | null = input.alarmLevel ?? null;

    if (input.alarmLevel === undefined) {
      const earlier = sortTimeline(this.toStates(entries))
        .filter((state) => !state.voided)
        .filter((state) => state.occurredAt <= input.occurredAt)
        .at(-1);
      alarmLevel = earlier?.alarmLevel ?? null;
    }

    return {
      status: input.status,
      alarmLevel,
      occurredAt: input.occurredAt,
      remarks: input.remarks,
    };
  }

  private toStates(entries: TimelineEntryRow[]): TimelineEntryState[] {
    return entries.map((entry) => ({
      status: entry.status,
      alarmLevel: entry.alarmLevel,
      occurredAt: entry.occurredAt,
      createdAt: entry.createdAt,
      voided: entry.voidedAt !== null,
    }));
  }

  private toState(entry: NewTimelineEntry): TimelineEntryState {
    return { ...entry, createdAt: new Date() };
  }

  private assertInvestigationKeepsStatus(
    entries: TimelineEntryRow[],
    next: { status: FireIncidentStatus },
    investigationCount: number,
  ): void {
    if (investigationCount === 0) {
      return;
    }

    const before = currentTimelineState(this.toStates(entries));

    if (
      INVESTIGABLE_STATUSES.includes(before.status) &&
      !INVESTIGABLE_STATUSES.includes(next.status)
    ) {
      throw new ConflictException(
        'This change would move an investigated incident out of its completed status.',
      );
    }
  }

  private withoutUndefined<T extends object>(value: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(value).filter(([, field]) => field !== undefined),
    ) as Partial<T>;
  }

  private page<T>(data: T[], total: number, page: number) {
    return {
      data,
      pagination: {
        page,
        limit: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    };
  }
}
