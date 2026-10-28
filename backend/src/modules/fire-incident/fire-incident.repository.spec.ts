import { Test, TestingModule } from '@nestjs/testing';
import { FireIncidentRepository } from './fire-incident.repository.js';
import { PrismaService } from '../../prisma.service.js';

const incidentId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';

describe('FireIncidentRepository', () => {
  let repository: FireIncidentRepository;
  let tx: {
    $queryRaw: ReturnType<typeof vi.fn>;
    fireIncident: Record<string, ReturnType<typeof vi.fn>>;
    fireIncidentEvent: { create: ReturnType<typeof vi.fn> };
    auditLog: { create: ReturnType<typeof vi.fn> };
    incidentTimeline: Record<string, ReturnType<typeof vi.fn>>;
    incidentNumberCounter: { upsert: ReturnType<typeof vi.fn> };
  };
  let prisma: {
    $transaction: ReturnType<typeof vi.fn>;
    fireIncident: { create: ReturnType<typeof vi.fn> };
  };

  beforeEach(async () => {
    tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      fireIncident: {
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      fireIncidentEvent: { create: vi.fn() },
      auditLog: { create: vi.fn() },
      incidentTimeline: {
        update: vi.fn(),
        create: vi.fn().mockResolvedValue({ id: 'new-entry' }),
      },
      incidentNumberCounter: {
        upsert: vi.fn().mockResolvedValue({ lastNumber: 7 }),
      },
    };
    prisma = {
      // Interactive transactions run the callback with the transaction client.
      $transaction: vi.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
      fireIncident: { create: vi.fn().mockResolvedValue({ id: incidentId }) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FireIncidentRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<FireIncidentRepository>(FireIncidentRepository);
  });

  describe('createSubmittedIncident', () => {
    it('creates the incident, location, first entry and event in one nested write', async () => {
      const occurredAt = new Date('2026-10-10T10:00:00+08:00');

      await repository.createSubmittedIncident({
        officeId: 'station-1',
        createdById: actorId,
        categoryId: 'category-1',
        location: {
          placeOfOccurence: '12 Rizal St.',
          barangay: 'San Isidro',
          region: 'NCR',
          province_district: 'QC District',
          city_municipality: 'Quezon City',
        },
        initialEntry: {
          status: 'ON_GOING',
          alarmLevel: 'FIRST_ALARM',
          occurredAt,
        },
      });

      expect(prisma.fireIncident.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          officeId: 'station-1',
          createdById: actorId,
          fireIncidentStatus: 'ON_GOING',
          currentAlarmLevel: 'FIRST_ALARM',
          approvalStatus: 'PENDING',
          location: {
            create: expect.objectContaining({ barangay: 'San Isidro' }),
          },
          timeline: {
            create: {
              status: 'ON_GOING',
              alarmLevel: 'FIRST_ALARM',
              occurredAt,
              createdById: actorId,
            },
          },
          events: { create: { type: 'SUBMITTED', actorId } },
        }),
        select: { id: true },
      });
      expect(
        prisma.fireIncident.create.mock.calls[0][0].data,
      ).not.toHaveProperty('incidentNo');
    });
  });

  describe('approve', () => {
    it('locks the incident, assigns the number and records the event', async () => {
      tx.fireIncident.findUnique.mockResolvedValue({
        approvalStatus: 'PENDING',
        deletedAt: null,
      });

      const result = await repository.approve(incidentId, actorId, 'NCR');

      expect(tx.$queryRaw).toHaveBeenCalled();
      expect(result?.incidentNo).toMatch(/^\d{4}-\d{2}-NCR-000007$/);
      expect(tx.fireIncident.update).toHaveBeenCalledWith({
        where: { id: incidentId },
        data: { approvalStatus: 'APPROVED', incidentNo: result?.incidentNo },
      });
      expect(tx.fireIncidentEvent.create).toHaveBeenCalledWith({
        data: { fireIncidentId: incidentId, type: 'APPROVED', actorId },
      });
    });

    it('returns null and assigns no number when the incident is not pending', async () => {
      tx.fireIncident.findUnique.mockResolvedValue({
        approvalStatus: 'APPROVED',
        deletedAt: null,
      });

      await expect(
        repository.approve(incidentId, actorId, 'NCR'),
      ).resolves.toBeNull();
      expect(tx.incidentNumberCounter.upsert).not.toHaveBeenCalled();
      expect(tx.fireIncident.update).not.toHaveBeenCalled();
    });
  });

  describe('changeApprovalStatus', () => {
    it('only changes an incident still in the expected state', async () => {
      tx.fireIncident.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        repository.changeApprovalStatus(incidentId, 'PENDING', 'REJECTED', {
          type: 'REJECTED',
          actorId,
        }),
      ).resolves.toBe(false);
      expect(tx.fireIncident.updateMany).toHaveBeenCalledWith({
        where: { id: incidentId, approvalStatus: 'PENDING', deletedAt: null },
        data: { approvalStatus: 'REJECTED' },
      });
      expect(tx.fireIncidentEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('softDelete and restore', () => {
    it('hides the incident and records the reason and memo', async () => {
      await expect(
        repository.softDelete(incidentId, actorId, 'DELETED', {
          reason: 'Duplicate entry',
          memoReference: '2026-114',
        }),
      ).resolves.toBe(true);

      expect(tx.fireIncident.updateMany).toHaveBeenCalledWith({
        where: { id: incidentId, deletedAt: null },
        data: {
          deletedAt: expect.any(Date),
          deletedById: actorId,
          deletionReason: 'Duplicate entry',
          deletionMemoReference: '2026-114',
        },
      });
      expect(tx.fireIncidentEvent.create).toHaveBeenCalledWith({
        data: {
          fireIncidentId: incidentId,
          type: 'DELETED',
          actorId,
          remarks: 'Memo 2026-114: Duplicate entry',
        },
      });
    });

    it('writes an audit entry for a SUPER_ADMIN deletion', async () => {
      tx.fireIncident.findUnique.mockResolvedValue({
        officeId: 'station-1',
        office: { regionId: 'region-1' },
      });

      await repository.softDelete(incidentId, actorId, 'DELETED', {
        reason: 'Duplicate entry',
        memoReference: '2026-114',
      });

      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId,
          action: 'INCIDENT_DELETED',
          entityType: 'FIRE_INCIDENT',
          entityId: incidentId,
          officeId: 'station-1',
          regionId: 'region-1',
          changes: { reason: 'Duplicate entry', memoReference: '2026-114' },
        },
      });
    });

    it('writes no audit entry for a staff removal', async () => {
      await repository.softDelete(
        incidentId,
        actorId,
        'REMOVED',
        { reason: null },
        'REJECTED',
      );

      expect(tx.auditLog.create).not.toHaveBeenCalled();
    });

    it('writes an audit entry when an incident is restored', async () => {
      tx.fireIncident.findUnique.mockResolvedValue({
        officeId: 'station-1',
        office: { regionId: 'region-1' },
      });

      await expect(repository.restore(incidentId, actorId)).resolves.toBe(true);

      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'INCIDENT_RESTORED',
          entityId: incidentId,
        }),
      });
    });

    it('records a staff removal without a memo', async () => {
      await repository.softDelete(
        incidentId,
        actorId,
        'REMOVED',
        { reason: null },
        'REJECTED',
      );

      expect(tx.fireIncident.updateMany).toHaveBeenCalledWith({
        where: { id: incidentId, deletedAt: null, approvalStatus: 'REJECTED' },
        data: expect.objectContaining({ deletionMemoReference: null }),
      });
      expect(tx.fireIncidentEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ remarks: null }),
      });
    });

    it('only restores an incident that is deleted', async () => {
      tx.fireIncident.updateMany.mockResolvedValue({ count: 0 });

      await expect(repository.restore(incidentId, actorId)).resolves.toBe(
        false,
      );
      expect(tx.fireIncident.updateMany).toHaveBeenCalledWith({
        where: { id: incidentId, deletedAt: { not: null } },
        data: {
          deletedAt: null,
          deletedById: null,
          deletionReason: null,
          deletionMemoReference: null,
        },
      });
    });
  });

  describe('changeTimeline', () => {
    it('returns null for a deleted incident without running the plan', async () => {
      tx.fireIncident.findUnique.mockResolvedValue({
        deletedAt: new Date(),
        timeline: [],
        _count: { investigations: 0 },
      });
      const plan = vi.fn();

      await expect(
        repository.changeTimeline(incidentId, actorId, plan),
      ).resolves.toBeNull();
      expect(plan).not.toHaveBeenCalled();
    });

    it('applies a correction: voids the entry, links the replacement and updates the incident', async () => {
      const entries = [{ id: 'e1' }];
      tx.fireIncident.findUnique.mockResolvedValue({
        deletedAt: null,
        timeline: entries,
        _count: { investigations: 2 },
      });
      const occurredAt = new Date('2026-10-10T12:30:00+08:00');
      const plan = vi.fn().mockReturnValue({
        voidEntry: { id: 'e1', reason: 'Wrong time' },
        newEntry: { status: 'FIRE_OUT', alarmLevel: null, occurredAt },
        current: { status: 'FIRE_OUT', alarmLevel: null },
      });

      const result = await repository.changeTimeline(incidentId, actorId, plan);

      expect(tx.$queryRaw).toHaveBeenCalled();
      expect(plan).toHaveBeenCalledWith({ entries, investigationCount: 2 });
      expect(tx.incidentTimeline.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: {
          voidedAt: expect.any(Date),
          voidedById: actorId,
          voidReason: 'Wrong time',
        },
      });
      expect(tx.incidentTimeline.create).toHaveBeenCalledWith({
        data: {
          status: 'FIRE_OUT',
          alarmLevel: null,
          occurredAt,
          fireIncidentId: incidentId,
          createdById: actorId,
          correctsEntryId: 'e1',
        },
        select: { id: true },
      });
      expect(tx.fireIncident.update).toHaveBeenCalledWith({
        where: { id: incidentId },
        data: { fireIncidentStatus: 'FIRE_OUT', currentAlarmLevel: null },
      });
      expect(result).toEqual({
        entryId: 'new-entry',
        current: { status: 'FIRE_OUT', alarmLevel: null },
      });
    });

    it('writes nothing when the plan rejects the change', async () => {
      tx.fireIncident.findUnique.mockResolvedValue({
        deletedAt: null,
        timeline: [],
        _count: { investigations: 0 },
      });

      await expect(
        repository.changeTimeline(incidentId, actorId, () => {
          throw new Error('invalid');
        }),
      ).rejects.toThrow('invalid');
      expect(tx.incidentTimeline.create).not.toHaveBeenCalled();
      expect(tx.fireIncident.update).not.toHaveBeenCalled();
    });
  });
});
