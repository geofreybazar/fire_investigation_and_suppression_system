import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { type UUID } from 'crypto';
import { InvestigationService } from './investigation.service.js';
import { InvestigationRepository } from './investigation.repository.js';
import { type CurrentUserJwtPayload } from '../../types/jwt.payload.js';
import { type ROLE } from '../../generated/prisma/enums.js';
import { NotificationDispatcher } from '../notification/notification.dispatcher.js';

const STATION = 'station-1';
const DISTRICT = 'district-1';
const REGION = 'region-1';
const NHQ = 'nhq';
const incidentId = '11111111-1111-4111-8111-111111111111';
const investigationId = '22222222-2222-4222-8222-222222222222';
const investigatorId = '33333333-3333-4333-8333-333333333333';

const officeTypes: Record<string, string> = {
  [STATION]: 'CITY_FIRE_STATION',
  [DISTRICT]: 'DISTRICT_FIRE_STATION',
  [REGION]: 'REGIONAL_OFFICE',
  [NHQ]: 'NATIONAL_HEADQUARTERS',
};

const userWith = (
  role: ROLE,
  officeId: string,
  sub = '44444444-4444-4444-8444-444444444444',
): CurrentUserJwtPayload => ({
  sub: sub as UUID,
  account_number: 'ACC001',
  role,
  positionId: 'position-1',
  officeId,
});

const stationChief = userWith('CITY_MUNICIPALITY_CHIEF_INVESTIGATOR', STATION);
const districtChief = userWith(
  'DISTRICT_PROVINCE_CHIEF_INVESTIGATOR',
  DISTRICT,
);
const regionalChief = userWith('REGIONAL_CHIEF_INVESTIGATOR', REGION);
const investigator = userWith(
  'CITY_MUNICIPALITY_INVESTIGATOR',
  STATION,
  investigatorId,
);
const otherInvestigator = userWith('CITY_MUNICIPALITY_INVESTIGATOR', STATION);
const staff = userWith('CITY_MUNICIPALITY_OPERATION_STAFF', STATION);

const incident = (overrides: Record<string, unknown> = {}) => ({
  id: incidentId,
  incidentNo: '2026-10-NCR-000123',
  officeId: STATION,
  approvalStatus: 'APPROVED',
  deletedAt: null,
  fireIncidentStatus: 'FIRE_OUT',
  investigationHandlingOfficeId: null,
  office: {
    id: STATION,
    name: 'Quezon City Fire Station',
    type: 'CITY_FIRE_STATION',
    parentId: DISTRICT,
    regionId: REGION,
    parent: {
      id: DISTRICT,
      name: 'QC District',
      type: 'DISTRICT_FIRE_STATION',
    },
    region: {
      id: REGION,
      name: 'NCR',
      type: 'REGIONAL_OFFICE',
      parent: { id: NHQ, name: 'NHQ', type: 'NATIONAL_HEADQUARTERS' },
    },
  },
  ...overrides,
});

const investigation = (overrides: Record<string, unknown> = {}) => ({
  id: investigationId,
  investigationNo: 'INV-2026-10-NCR-000123-01',
  fireIncidentId: incidentId,
  conductingOfficeId: STATION,
  assignedInvestigatorId: investigatorId,
  classification: 'ACCIDENTAL',
  causeOfFire: 'OVERHEATED_HOME_APPLIANCES',
  completedAt: null,
  report: { status: 'DRAFT' },
  fireIncident: {
    officeId: STATION,
    approvalStatus: 'APPROVED',
    deletedAt: null,
    office: { id: STATION, parentId: DISTRICT, regionId: REGION },
  },
  ...overrides,
});

describe('InvestigationService', () => {
  let service: InvestigationService;
  let repository: Record<string, ReturnType<typeof vi.fn>>;

  let dispatcher: { notify: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    dispatcher = { notify: vi.fn().mockResolvedValue(undefined) };
    repository = {
      findOfficeType: vi.fn((officeId: string) =>
        Promise.resolve({ id: officeId, type: officeTypes[officeId] }),
      ),
      findIncident: vi.fn().mockResolvedValue(incident()),
      findIncidentInvestigations: vi
        .fn()
        .mockResolvedValue({ referrals: [], investigations: [] }),
      findInvestigators: vi.fn().mockResolvedValue([]),
      findUser: vi.fn().mockResolvedValue({
        id: investigatorId,
        role: 'CITY_MUNICIPALITY_INVESTIGATOR',
        isActive: true,
        officeId: STATION,
      }),
      refer: vi.fn().mockResolvedValue(true),
      start: vi.fn(
        (
          _incidentId: string,
          _data: unknown,
          numberFor: (existing: number) => string,
        ) =>
          Promise.resolve({
            id: investigationId,
            investigationNo: numberFor(0),
          }),
      ),
      findForAccess: vi.fn().mockResolvedValue(investigation()),
      findDetail: vi.fn().mockResolvedValue({ id: investigationId }),
      updateDraft: vi.fn().mockResolvedValue(true),
      submitReport: vi.fn().mockResolvedValue(true),
      review: vi.fn().mockResolvedValue(true),
      findQueue: vi.fn().mockResolvedValue({ incidents: [], total: 0 }),
      findAssigned: vi.fn().mockResolvedValue({ investigations: [], total: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvestigationService,
        { provide: InvestigationRepository, useValue: repository },
        { provide: NotificationDispatcher, useValue: dispatcher },
      ],
    }).compile();

    service = module.get<InvestigationService>(InvestigationService);
  });

  describe('getCase', () => {
    it("lets the station's chief decide a completed, approved incident", async () => {
      const result = await service.getCase(incidentId, stationChief);

      expect(result.handlingOffice?.id).toBe(STATION);
      expect(result.canDecide).toBe(true);
      expect(result.referralTargets.map((office) => office.id)).toEqual([
        DISTRICT,
        REGION,
        NHQ,
      ]);
    });

    it('lets nobody decide while an investigation is open', async () => {
      repository.findIncidentInvestigations.mockResolvedValue({
        referrals: [],
        investigations: [{ id: investigationId, completedAt: null }],
      });

      const result = await service.getCase(incidentId, stationChief);

      expect(result.canDecide).toBe(false);
      expect(result.referralTargets).toEqual([]);
    });

    it('shows the case read-only to other viewers', async () => {
      const result = await service.getCase(incidentId, staff);

      expect(result.canDecide).toBe(false);
    });

    it('returns 404 for an incident the user cannot see', async () => {
      repository.findIncident.mockResolvedValue(
        incident({ approvalStatus: 'PENDING' }),
      );

      await expect(service.getCase(incidentId, regionalChief)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('refer', () => {
    it('refers the case up from the station, recording the direction', async () => {
      await expect(
        service.refer(incidentId, { toOfficeId: REGION }, stationChief),
      ).resolves.toEqual({ message: 'Case referred.', direction: 'UP' });
      expect(repository.refer).toHaveBeenCalledWith(incidentId, {
        fromOfficeId: STATION,
        toOfficeId: REGION,
        direction: 'UP',
        referredById: stationChief.sub,
        remarks: undefined,
      });
    });

    it('lets the new handling office refer it back down', async () => {
      repository.findIncident.mockResolvedValue(
        incident({ investigationHandlingOfficeId: REGION }),
      );

      await expect(
        service.refer(incidentId, { toOfficeId: DISTRICT }, regionalChief),
      ).resolves.toMatchObject({ direction: 'DOWN' });
    });

    it("forbids the station's chief once the case has moved up", async () => {
      repository.findIncident.mockResolvedValue(
        incident({ investigationHandlingOfficeId: REGION }),
      );

      await expect(
        service.refer(incidentId, { toOfficeId: NHQ }, stationChief),
      ).rejects.toThrow(ForbiddenException);
    });

    it('forbids a chief of an office above that does not handle the case', async () => {
      await expect(
        service.refer(incidentId, { toOfficeId: REGION }, districtChief),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects a target outside the chain', async () => {
      await expect(
        service.refer(incidentId, { toOfficeId: 'other-region' }, stationChief),
      ).rejects.toThrow(BadRequestException);
    });

    it.each([
      ['not completed', { fireIncidentStatus: 'REKINDLE' }],
      ['a false alarm', { fireIncidentStatus: 'FALSE_ALARM' }],
    ])(
      'rejects referring an incident that is %s',
      async (_label, overrides) => {
        repository.findIncident.mockResolvedValue(incident(overrides));

        await expect(
          service.refer(incidentId, { toOfficeId: REGION }, stationChief),
        ).rejects.toThrow(BadRequestException);
        expect(repository.refer).not.toHaveBeenCalled();
      },
    );

    it('returns 409 when an investigation is open', async () => {
      repository.refer.mockResolvedValue(false);

      await expect(
        service.refer(incidentId, { toOfficeId: REGION }, stationChief),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('start', () => {
    it('creates the investigation, numbered from the incident, assigned to an investigator of the office', async () => {
      await expect(
        service.start(incidentId, { investigatorId }, stationChief),
      ).resolves.toEqual({
        id: investigationId,
        investigationNo: 'INV-2026-10-NCR-000123-01',
      });
      expect(repository.start).toHaveBeenCalledWith(
        incidentId,
        {
          incidentNo: '2026-10-NCR-000123',
          conductingOfficeId: STATION,
          assignedInvestigatorId: investigatorId,
          assignedById: stationChief.sub,
        },
        expect.any(Function),
      );
    });

    it.each([
      ['inactive', { isActive: false }],
      ['not an investigator', { role: 'CITY_MUNICIPALITY_OPERATION_STAFF' }],
      ['from another office', { officeId: DISTRICT }],
    ])('rejects an assignee who is %s', async (_label, overrides) => {
      repository.findUser.mockResolvedValue({
        id: investigatorId,
        role: 'CITY_MUNICIPALITY_INVESTIGATOR',
        isActive: true,
        officeId: STATION,
        ...overrides,
      });

      await expect(
        service.start(incidentId, { investigatorId }, stationChief),
      ).rejects.toThrow(BadRequestException);
      expect(repository.start).not.toHaveBeenCalled();
    });

    it('rejects starting on a pending incident', async () => {
      repository.findIncident.mockResolvedValue(
        incident({ approvalStatus: 'PENDING', incidentNo: null }),
      );

      await expect(
        service.start(incidentId, { investigatorId }, stationChief),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns 409 when an investigation is already open', async () => {
      repository.start.mockResolvedValue(null);

      await expect(
        service.start(incidentId, { investigatorId }, stationChief),
      ).rejects.toThrow(ConflictException);
    });

    it('forbids an investigator from starting', async () => {
      await expect(
        service.start(incidentId, { investigatorId }, investigator),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('drafting and submitting', () => {
    it('lets the assigned investigator save the investigation and report', async () => {
      await service.updateDraft(
        investigationId,
        { classification: 'ACCIDENTAL', report: { findings: 'Faulty wiring' } },
        investigator,
      );

      expect(repository.updateDraft).toHaveBeenCalledWith(investigationId, {
        investigation: { classification: 'ACCIDENTAL' },
        report: { findings: 'Faulty wiring' },
      });
    });

    it('forbids another investigator', async () => {
      await expect(
        service.updateDraft(investigationId, {}, otherInvestigator),
      ).rejects.toThrow(ForbiddenException);
    });

    it.each(['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'])(
      'locks the investigation while the report is %s',
      async (status) => {
        repository.findForAccess.mockResolvedValue(
          investigation({ report: { status } }),
        );

        await expect(
          service.updateDraft(investigationId, {}, investigator),
        ).rejects.toThrow(ConflictException);
      },
    );

    it('allows editing again after a rejection', async () => {
      repository.findForAccess.mockResolvedValue(
        investigation({ report: { status: 'REJECTED' } }),
      );

      await expect(
        service.updateDraft(investigationId, {}, investigator),
      ).resolves.toBeDefined();
    });

    it('submits a concluded report', async () => {
      await expect(
        service.submit(investigationId, investigator),
      ).resolves.toEqual({ message: 'Report submitted.' });
    });

    it('requires a report before submitting', async () => {
      repository.findForAccess.mockResolvedValue(
        investigation({ report: null }),
      );

      await expect(
        service.submit(investigationId, investigator),
      ).rejects.toThrow('Write the report before submitting it.');
    });

    it('requires a classification and cause before submitting', async () => {
      repository.findForAccess.mockResolvedValue(
        investigation({ classification: 'UNDER_INVESTIGATION' }),
      );

      await expect(
        service.submit(investigationId, investigator),
      ).rejects.toThrow(BadRequestException);
      expect(repository.submitReport).not.toHaveBeenCalled();
    });
  });

  describe('review', () => {
    beforeEach(() => {
      repository.findForAccess.mockResolvedValue(
        investigation({ report: { status: 'SUBMITTED' } }),
      );
    });

    it("lets the conducting office's chief approve", async () => {
      await service.review(
        investigationId,
        { decision: 'APPROVED' },
        stationChief,
      );

      expect(repository.review).toHaveBeenCalledWith(
        investigationId,
        'APPROVED',
        stationChief.sub,
        undefined,
      );
    });

    it('forbids the investigator from reviewing', async () => {
      await expect(
        service.review(investigationId, { decision: 'APPROVED' }, investigator),
      ).rejects.toThrow(ForbiddenException);
    });

    it("forbids another office's chief", async () => {
      await expect(
        service.review(
          investigationId,
          { decision: 'APPROVED' },
          regionalChief,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('requires a concluded investigation to approve', async () => {
      repository.findForAccess.mockResolvedValue(
        investigation({
          causeOfFire: 'UNDER_INVESTIGATION',
          report: { status: 'SUBMITTED' },
        }),
      );

      await expect(
        service.review(investigationId, { decision: 'APPROVED' }, stationChief),
      ).rejects.toThrow(BadRequestException);
      expect(repository.review).not.toHaveBeenCalled();
    });

    it('returns 409 when the report is not in a reviewable state', async () => {
      repository.review.mockResolvedValue(false);

      await expect(
        service.review(
          investigationId,
          { decision: 'REJECTED', remarks: 'Missing evidence' },
          stationChief,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('work lists', () => {
    it("lists the chief's office queue", async () => {
      await service.findQueue(2, stationChief);

      expect(repository.findQueue).toHaveBeenCalledWith(STATION, 10, 10);
    });

    it('forbids a non-chief queue', async () => {
      await expect(service.findQueue(1, investigator)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("lists the investigator's assignments", async () => {
      await service.findAssigned(1, investigator);

      expect(repository.findAssigned).toHaveBeenCalledWith(
        investigatorId,
        0,
        10,
      );
    });
  });

  describe('notifications (Q-21)', () => {
    it("notifies the target office's chief investigators of a referral", async () => {
      await service.refer(incidentId, { toOfficeId: DISTRICT }, stationChief);

      expect(dispatcher.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CASE_REFERRED',
          entityType: 'FIRE_INCIDENT',
          entityId: incidentId,
          actorId: stationChief.sub,
          recipients: {
            officeId: DISTRICT,
            roles: expect.arrayContaining([
              'DISTRICT_PROVINCE_CHIEF_INVESTIGATOR',
            ]),
          },
        }),
      );
    });

    it('notifies the assigned investigator when an investigation starts', async () => {
      await service.start(
        incidentId,
        { investigatorId: investigatorId },
        stationChief,
      );

      expect(dispatcher.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'INVESTIGATOR_ASSIGNED',
          entityType: 'INVESTIGATION',
          entityId: investigationId,
          recipients: { userIds: [investigatorId] },
        }),
      );
    });

    it('notifies the handling chiefs when the report is submitted', async () => {
      await service.submit(investigationId, investigator);

      expect(dispatcher.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'REPORT_SUBMITTED',
          body: 'The report for investigation INV-2026-10-NCR-000123-01 is ready for your review.',
          recipients: expect.objectContaining({ officeId: STATION }),
        }),
      );
    });

    it('notifies the investigator of a rejection with the remarks', async () => {
      repository.findForAccess.mockResolvedValue(
        investigation({ report: { status: 'UNDER_REVIEW' } }),
      );

      await service.review(
        investigationId,
        { decision: 'REJECTED', remarks: 'Add witness statements' },
        stationChief,
      );

      expect(dispatcher.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'REPORT_REJECTED',
          body: 'Your report for investigation INV-2026-10-NCR-000123-01 was rejected: Add witness statements',
          recipients: { userIds: [investigatorId] },
        }),
      );
    });

    it('notifies the investigator of an approval', async () => {
      repository.findForAccess.mockResolvedValue(
        investigation({ report: { status: 'UNDER_REVIEW' } }),
      );

      await service.review(
        investigationId,
        { decision: 'APPROVED' },
        stationChief,
      );

      expect(dispatcher.notify).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'REPORT_APPROVED' }),
      );
    });

    it('sends nothing when the report only moves under review', async () => {
      await service.review(
        investigationId,
        { decision: 'UNDER_REVIEW' },
        stationChief,
      );

      expect(dispatcher.notify).not.toHaveBeenCalled();
    });
  });
});
