import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { type UUID } from 'crypto';
import { FireIncidentService } from './fire-incident.service.js';
import {
  FireIncidentRepository,
  type TimelineChange,
  type TimelineEntryRow,
} from './fire-incident.repository.js';
import { type CurrentUserJwtPayload } from '../../types/jwt.payload.js';
import { type CreateFireIncidentInput } from './schema/fire-incident.schema.js';
import { type ROLE } from '../../generated/prisma/enums.js';

const STATION = 'station-1';
const OTHER_STATION = 'station-2';
const DISTRICT = 'district-1';
const REGION = 'region-1';
const NHQ = 'nhq';
const incidentId = '11111111-1111-4111-8111-111111111111';
const categoryId = '22222222-2222-4222-8222-222222222222';
const subcategoryId = '33333333-3333-4333-8333-333333333333';

const officeTypes: Record<string, string> = {
  [STATION]: 'CITY_FIRE_STATION',
  [OTHER_STATION]: 'CITY_FIRE_STATION',
  [DISTRICT]: 'DISTRICT_FIRE_STATION',
  [REGION]: 'REGIONAL_OFFICE',
  [NHQ]: 'NATIONAL_HEADQUARTERS',
};

const userWith = (role: ROLE, officeId = STATION): CurrentUserJwtPayload => ({
  sub: '44444444-4444-4444-8444-444444444444' as UUID,
  account_number: 'ACC001',
  role,
  positionId: 'position-1',
  officeId,
});

const staff = userWith('CITY_MUNICIPALITY_OPERATION_STAFF');
const commel = userWith('CITY_MUNICIPALITY_COMMEL');
const chief = userWith('CITY_MUNICIPALITY_OPERATION');
const otherChief = userWith('CITY_MUNICIPALITY_OPERATION', OTHER_STATION);
const stationInvestigator = userWith('CITY_MUNICIPALITY_INVESTIGATOR');
const superAdmin = userWith('SUPER_ADMIN', NHQ);

const at = (hhmm: string) => new Date(`2026-10-10T${hhmm}:00+08:00`);

const row = (
  id: string,
  status: TimelineEntryRow['status'],
  hhmm: string,
  alarmLevel: TimelineEntryRow['alarmLevel'] = null,
  voided = false,
): TimelineEntryRow => ({
  id,
  status,
  alarmLevel,
  occurredAt: at(hhmm),
  createdAt: at(hhmm),
  voidedAt: voided ? at(hhmm) : null,
});

const accessIncident = (overrides: Record<string, unknown> = {}) => ({
  id: incidentId,
  officeId: STATION,
  approvalStatus: 'APPROVED',
  deletedAt: null,
  categoryId,
  subcategoryId: null,
  location: { latitude: null, longitude: null },
  office: {
    id: STATION,
    parentId: DISTRICT,
    regionId: REGION,
    region: { regionCode: 'NCR' },
  },
  ...overrides,
});

const submission: CreateFireIncidentInput = {
  categoryId,
  location: { placeOfOccurence: '12 Rizal St.', barangay: 'San Isidro' },
  initialEntry: { status: 'VERIFICATION', occurredAt: at('10:00') },
};

describe('FireIncidentService', () => {
  let service: FireIncidentService;
  let repository: Record<string, ReturnType<typeof vi.fn>>;
  let timeline: TimelineEntryRow[];
  let investigationCount: number;

  beforeEach(async () => {
    timeline = [];
    investigationCount = 0;

    repository = {
      findOfficeType: vi.fn((officeId: string) =>
        Promise.resolve(
          officeTypes[officeId]
            ? { id: officeId, type: officeTypes[officeId] }
            : null,
        ),
      ),
      findStationForSubmission: vi.fn().mockResolvedValue({
        id: STATION,
        name: 'Quezon City Fire Station',
        type: 'CITY_FIRE_STATION',
        parent: { name: 'QC District' },
        region: { name: 'NCR Regional Office' },
      }),
      findCategory: vi.fn().mockResolvedValue({ id: categoryId }),
      findSubcategory: vi.fn(),
      findEstablishment: vi.fn(),
      createSubmittedIncident: vi.fn().mockResolvedValue({ id: incidentId }),
      findPaginated: vi.fn().mockResolvedValue({ incidents: [], total: 0 }),
      findForAccess: vi.fn().mockResolvedValue(accessIncident()),
      findDetail: vi.fn().mockResolvedValue({ id: incidentId }),
      updateDetails: vi.fn().mockResolvedValue({ id: incidentId }),
      changeApprovalStatus: vi.fn().mockResolvedValue(true),
      approve: vi.fn().mockResolvedValue({ incidentNo: '2026-10-NCR-000001' }),
      softDelete: vi.fn().mockResolvedValue(true),
      restore: vi.fn().mockResolvedValue(true),
      findDeletedPaginated: vi
        .fn()
        .mockResolvedValue({ incidents: [], total: 0 }),
      // Runs the service's plan against the current test timeline, like the
      // real repository does inside its transaction.
      changeTimeline: vi.fn(
        (
          _id: string,
          _actorId: string,
          plan: (context: {
            entries: TimelineEntryRow[];
            investigationCount: number;
          }) => TimelineChange,
        ) => {
          const change = plan({ entries: timeline, investigationCount });
          return Promise.resolve({ entryId: 'new-entry', ...change });
        },
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FireIncidentService,
        { provide: FireIncidentRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<FireIncidentService>(FireIncidentService);
  });

  describe('submit', () => {
    it('creates a pending incident owned by the station, with the location derived from it', async () => {
      await expect(service.submit(submission, staff)).resolves.toEqual({
        id: incidentId,
      });

      expect(repository.createSubmittedIncident).toHaveBeenCalledWith(
        expect.objectContaining({
          officeId: STATION,
          createdById: staff.sub,
          categoryId,
          location: {
            placeOfOccurence: '12 Rizal St.',
            barangay: 'San Isidro',
            latitude: null,
            longitude: null,
            city_municipality: 'Quezon City Fire Station',
            province_district: 'QC District',
            region: 'NCR Regional Office',
          },
          initialEntry: {
            status: 'VERIFICATION',
            alarmLevel: null,
            occurredAt: at('10:00'),
            remarks: undefined,
          },
        }),
      );
    });

    it('lets COMMEL submit too', async () => {
      await service.submit(submission, commel);

      expect(repository.createSubmittedIncident).toHaveBeenCalled();
    });

    it('forbids users who are not at a city or municipal station', async () => {
      repository.findStationForSubmission.mockResolvedValue({
        id: DISTRICT,
        name: 'QC District',
        type: 'DISTRICT_FIRE_STATION',
        parent: { name: 'NCR' },
        region: { name: 'NCR' },
      });

      await expect(service.submit(submission, staff)).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.createSubmittedIncident).not.toHaveBeenCalled();
    });

    it('rejects a station missing its district or region', async () => {
      repository.findStationForSubmission.mockResolvedValue({
        id: STATION,
        name: 'Quezon City Fire Station',
        type: 'CITY_FIRE_STATION',
        parent: null,
        region: null,
      });

      await expect(service.submit(submission, staff)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects an unknown category', async () => {
      repository.findCategory.mockResolvedValue(null);

      await expect(service.submit(submission, staff)).rejects.toThrow(
        'The incident category does not exist.',
      );
    });

    it('rejects a subcategory from another category', async () => {
      repository.findSubcategory.mockResolvedValue({
        id: subcategoryId,
        categoryId: 'another-category',
      });

      await expect(
        service.submit({ ...submission, subcategoryId }, staff),
      ).rejects.toThrow(
        'The subcategory does not belong to the selected category.',
      );
    });

    it('rejects an unknown establishment', async () => {
      repository.findEstablishment.mockResolvedValue(null);

      await expect(
        service.submit(
          { ...submission, establishmentId: subcategoryId },
          staff,
        ),
      ).rejects.toThrow('The establishment does not exist.');
    });

    it('rejects an invalid initial status', async () => {
      await expect(
        service.submit(
          {
            ...submission,
            initialEntry: { status: 'FIRE_OUT', occurredAt: at('10:00') },
          },
          staff,
        ),
      ).rejects.toThrow('An incident cannot start as FIRE_OUT');
      expect(repository.createSubmittedIncident).not.toHaveBeenCalled();
    });
  });

  describe('findPaginated', () => {
    it("combines the viewer's scope with the filters", async () => {
      repository.findPaginated.mockResolvedValue({
        incidents: [{ id: incidentId }],
        total: 11,
      });

      const result = await service.findPaginated(
        { page: 2, status: 'FIRE_OUT', search: 'NCR' },
        staff,
      );

      expect(repository.findPaginated).toHaveBeenCalledWith(
        {
          AND: [
            {
              deletedAt: null,
              office: {
                OR: [
                  { id: STATION },
                  { parentId: STATION },
                  { regionId: STATION },
                ],
              },
            },
            {
              fireIncidentStatus: 'FIRE_OUT',
              OR: [
                { incidentNo: { contains: 'NCR', mode: 'insensitive' } },
                {
                  location: {
                    placeOfOccurence: { contains: 'NCR', mode: 'insensitive' },
                  },
                },
                {
                  location: {
                    barangay: { contains: 'NCR', mode: 'insensitive' },
                  },
                },
              ],
            },
          ],
        },
        10,
        10,
      );
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 11,
        totalPages: 2,
      });
    });

    it('forbids NHQ_ADMIN', async () => {
      await expect(
        service.findPaginated({ page: 1 }, userWith('NHQ_ADMIN', NHQ)),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('returns the detail of a visible incident', async () => {
      await expect(
        service.findOne(incidentId, stationInvestigator),
      ).resolves.toEqual({ id: incidentId });
    });

    it('returns 404 for an incident outside the viewer scope', async () => {
      await expect(service.findOne(incidentId, otherChief)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.findDetail).not.toHaveBeenCalled();
    });

    it('returns 404 for a pending incident to a station investigator', async () => {
      repository.findForAccess.mockResolvedValue(
        accessIncident({ approvalStatus: 'PENDING' }),
      );

      await expect(
        service.findOne(incidentId, stationInvestigator),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve and reject', () => {
    beforeEach(() => {
      repository.findForAccess.mockResolvedValue(
        accessIncident({ approvalStatus: 'PENDING' }),
      );
    });

    it("lets the station's chief approve, numbering with the region code", async () => {
      await expect(service.approve(incidentId, chief)).resolves.toEqual({
        incidentNo: '2026-10-NCR-000001',
      });
      expect(repository.approve).toHaveBeenCalledWith(
        incidentId,
        chief.sub,
        'NCR',
      );
    });

    it('forbids staff from approving', async () => {
      await expect(service.approve(incidentId, staff)).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.approve).not.toHaveBeenCalled();
    });

    it("hides another station's incident from its chief", async () => {
      await expect(service.approve(incidentId, otherChief)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('requires the region code', async () => {
      repository.findForAccess.mockResolvedValue(
        accessIncident({
          approvalStatus: 'PENDING',
          office: {
            id: STATION,
            parentId: DISTRICT,
            regionId: REGION,
            region: { regionCode: null },
          },
        }),
      );

      await expect(service.approve(incidentId, chief)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.approve).not.toHaveBeenCalled();
    });

    it('returns 409 when the incident is no longer pending', async () => {
      repository.approve.mockResolvedValue(null);

      await expect(service.approve(incidentId, chief)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects with remarks', async () => {
      await expect(
        service.reject(incidentId, { remarks: 'Wrong category' }, chief),
      ).resolves.toEqual({ message: 'Fire incident rejected.' });
      expect(repository.changeApprovalStatus).toHaveBeenCalledWith(
        incidentId,
        'PENDING',
        'REJECTED',
        { type: 'REJECTED', actorId: chief.sub, remarks: 'Wrong category' },
      );
    });

    it('returns 409 when rejecting an incident that is not pending', async () => {
      repository.changeApprovalStatus.mockResolvedValue(false);

      await expect(
        service.reject(incidentId, { remarks: 'x' }, chief),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('resubmit', () => {
    it('moves a rejected incident back to pending', async () => {
      repository.findForAccess.mockResolvedValue(
        accessIncident({ approvalStatus: 'REJECTED' }),
      );

      await service.resubmit(incidentId, staff);

      expect(repository.changeApprovalStatus).toHaveBeenCalledWith(
        incidentId,
        'REJECTED',
        'PENDING',
        { type: 'RESUBMITTED', actorId: staff.sub },
      );
    });

    it('forbids the chief from resubmitting', async () => {
      await expect(service.resubmit(incidentId, chief)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('lets staff remove a rejected incident', async () => {
      repository.findForAccess.mockResolvedValue(
        accessIncident({ approvalStatus: 'REJECTED' }),
      );

      await service.remove(incidentId, {}, staff);

      expect(repository.softDelete).toHaveBeenCalledWith(
        incidentId,
        staff.sub,
        'REMOVED',
        { reason: null },
        'REJECTED',
      );
    });

    it.each(['PENDING', 'APPROVED'])(
      'forbids staff from removing a %s incident',
      async (approvalStatus) => {
        repository.findForAccess.mockResolvedValue(
          accessIncident({ approvalStatus }),
        );

        await expect(service.remove(incidentId, {}, staff)).rejects.toThrow(
          ForbiddenException,
        );
        expect(repository.softDelete).not.toHaveBeenCalled();
      },
    );

    it.each([
      [{}],
      [{ reason: 'Duplicate entry' }],
      [{ memoReference: '2026-114' }],
    ])(
      'requires SUPER_ADMIN to give a reason and memo reference (%o)',
      async (input) => {
        await expect(
          service.remove(incidentId, input, superAdmin),
        ).rejects.toThrow(BadRequestException);
        expect(repository.softDelete).not.toHaveBeenCalled();
      },
    );

    it('lets SUPER_ADMIN delete an approved incident with the memo reference', async () => {
      await service.remove(
        incidentId,
        { reason: 'Duplicate entry', memoReference: '2026-114' },
        superAdmin,
      );

      expect(repository.softDelete).toHaveBeenCalledWith(
        incidentId,
        superAdmin.sub,
        'DELETED',
        { reason: 'Duplicate entry', memoReference: '2026-114' },
      );
    });
  });

  describe('timeline', () => {
    beforeEach(() => {
      timeline = [
        row('e1', 'VERIFICATION', '10:00'),
        row('e2', 'ON_GOING', '10:10', 'SECOND_ALARM'),
      ];
    });

    it('adds a valid entry and recomputes the current status', async () => {
      const result = await service.addTimelineEntry(
        incidentId,
        { status: 'FIRE_UNDER_CONTROL', occurredAt: at('11:00') },
        staff,
      );

      expect(result).toMatchObject({
        // An omitted alarm keeps the alarm in effect at that time.
        newEntry: {
          status: 'FIRE_UNDER_CONTROL',
          alarmLevel: 'SECOND_ALARM',
          occurredAt: at('11:00'),
        },
        current: { status: 'FIRE_UNDER_CONTROL', alarmLevel: 'SECOND_ALARM' },
      });
    });

    it('rejects an entry that breaks the rules', async () => {
      await expect(
        service.addTimelineEntry(
          incidentId,
          { status: 'FALSE_ALARM', occurredAt: at('11:00') },
          staff,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a backdated entry with a lower alarm than the entry before it', async () => {
      await expect(
        service.addTimelineEntry(
          incidentId,
          {
            status: 'FIRE_UNDER_CONTROL',
            alarmLevel: 'FIRST_ALARM',
            occurredAt: at('10:30'),
          },
          staff,
        ),
      ).rejects.toThrow('The alarm level can only go up');
    });

    it('forbids the chief of operations from adding entries', async () => {
      await expect(
        service.addTimelineEntry(
          incidentId,
          { status: 'FIRE_OUT', occurredAt: at('11:00') },
          chief,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.changeTimeline).not.toHaveBeenCalled();
    });

    it('voids an entry and recomputes the current status', async () => {
      timeline.push(row('e3', 'FIRE_UNDER_CONTROL', '11:00', 'SECOND_ALARM'));

      const result = await service.voidTimelineEntry(
        incidentId,
        'e3',
        { reason: 'Typed by mistake' },
        staff,
      );

      expect(result).toMatchObject({
        voidEntry: { id: 'e3', reason: 'Typed by mistake' },
        current: { status: 'ON_GOING', alarmLevel: 'SECOND_ALARM' },
      });
    });

    it('returns 404 for an unknown entry and 409 for an already voided one', async () => {
      timeline.push(row('e3', 'FIRE_OUT', '12:00', 'SECOND_ALARM', true));

      await expect(
        service.voidTimelineEntry(incidentId, 'nope', { reason: 'x' }, staff),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.voidTimelineEntry(incidentId, 'e3', { reason: 'x' }, staff),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects a void that leaves an invalid timeline', async () => {
      await expect(
        service.voidTimelineEntry(incidentId, 'e1', { reason: 'x' }, staff),
      ).resolves.toBeDefined();

      timeline = [
        row('e1', 'VERIFICATION', '10:00'),
        row('e2', 'FIRE_UNDER_CONTROL', '10:10'),
      ];
      await expect(
        service.voidTimelineEntry(incidentId, 'e1', { reason: 'x' }, staff),
      ).rejects.toThrow('An incident cannot start as FIRE_UNDER_CONTROL');
    });

    it('blocks moving an investigated incident out of FIRE_OUT', async () => {
      timeline.push(row('e3', 'FIRE_OUT', '12:00', 'SECOND_ALARM'));
      investigationCount = 1;

      await expect(
        service.voidTimelineEntry(incidentId, 'e3', { reason: 'x' }, staff),
      ).rejects.toThrow(ConflictException);
    });

    it('corrects an entry by voiding it and adding the replacement', async () => {
      timeline.push(row('e3', 'FIRE_OUT', '12:00', 'SECOND_ALARM'));

      const result = await service.correctTimelineEntry(
        incidentId,
        'e3',
        {
          reason: 'Wrong time',
          entry: { status: 'FIRE_OUT', occurredAt: at('12:30') },
        },
        staff,
      );

      expect(result).toMatchObject({
        voidEntry: { id: 'e3', reason: 'Wrong time' },
        newEntry: {
          status: 'FIRE_OUT',
          alarmLevel: 'SECOND_ALARM',
          occurredAt: at('12:30'),
        },
        current: { status: 'FIRE_OUT', alarmLevel: 'SECOND_ALARM' },
      });
    });
  });

  describe('updateDetails', () => {
    it('updates details, location and impact in one write', async () => {
      await service.updateDetails(
        incidentId,
        {
          remarks: 'Updated',
          location: { barangay: 'Bagong Silang' },
          impact: { injuredCiv: 2 },
        },
        staff,
      );

      expect(repository.updateDetails).toHaveBeenCalledWith(incidentId, {
        remarks: 'Updated',
        location: { update: { barangay: 'Bagong Silang' } },
        impact: {
          upsert: { create: { injuredCiv: 2 }, update: { injuredCiv: 2 } },
        },
      });
    });

    it('validates a new subcategory against the current category', async () => {
      repository.findSubcategory.mockResolvedValue({
        id: subcategoryId,
        categoryId: 'another-category',
      });

      await expect(
        service.updateDetails(incidentId, { subcategoryId }, staff),
      ).rejects.toThrow(BadRequestException);
      expect(repository.updateDetails).not.toHaveBeenCalled();
    });

    it('forbids SUPER_ADMIN from editing', async () => {
      await expect(
        service.updateDetails(incidentId, { remarks: 'x' }, superAdmin),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleted incidents', () => {
    it('lists deleted incidents for SUPER_ADMIN', async () => {
      await service.findDeleted(1);

      expect(repository.findDeletedPaginated).toHaveBeenCalledWith(0, 10);
    });

    it('restores a deleted incident', async () => {
      await expect(service.restore(incidentId, superAdmin)).resolves.toEqual({
        message: 'Fire incident restored.',
      });
    });

    it('returns 404 when there is nothing to restore', async () => {
      repository.restore.mockResolvedValue(false);

      await expect(service.restore(incidentId, superAdmin)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
