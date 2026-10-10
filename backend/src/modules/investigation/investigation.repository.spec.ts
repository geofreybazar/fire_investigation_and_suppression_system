import { Test, TestingModule } from '@nestjs/testing';
import { InvestigationRepository } from './investigation.repository.js';
import { PrismaService } from '../../prisma.service.js';

const incidentId = '11111111-1111-4111-8111-111111111111';
const investigationId = '22222222-2222-4222-8222-222222222222';
const actorId = '33333333-3333-4333-8333-333333333333';

const lockedIncident = (overrides: Record<string, unknown> = {}) => ({
  officeId: 'station-1',
  deletedAt: null,
  investigationHandlingOfficeId: null,
  _count: { investigations: 0 },
  ...overrides,
});

describe('InvestigationRepository', () => {
  let repository: InvestigationRepository;
  let tx: {
    $queryRaw: ReturnType<typeof vi.fn>;
    fireIncident: Record<string, ReturnType<typeof vi.fn>>;
    investigation: Record<string, ReturnType<typeof vi.fn>>;
    investigationReferral: { create: ReturnType<typeof vi.fn> };
    investigationReport: Record<string, ReturnType<typeof vi.fn>>;
    investigationReportReview: { create: ReturnType<typeof vi.fn> };
  };
  let prisma: {
    $transaction: ReturnType<typeof vi.fn>;
    investigationReport: { updateMany: ReturnType<typeof vi.fn> };
  };

  beforeEach(async () => {
    tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      fireIncident: {
        findUnique: vi.fn().mockResolvedValue(lockedIncident()),
        update: vi.fn(),
      },
      investigation: {
        count: vi.fn().mockResolvedValue(1),
        create: vi.fn().mockResolvedValue({ id: investigationId }),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      investigationReferral: { create: vi.fn() },
      investigationReport: {
        findFirst: vi.fn().mockResolvedValue({ id: 'report-1' }),
        update: vi.fn(),
      },
      investigationReportReview: { create: vi.fn() },
    };
    prisma = {
      $transaction: vi.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
      investigationReport: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvestigationRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<InvestigationRepository>(InvestigationRepository);
  });

  const referral = {
    fromOfficeId: 'station-1',
    toOfficeId: 'region-1',
    direction: 'UP' as const,
    referredById: actorId,
  };

  describe('refer', () => {
    it('locks the incident, moves the case and records the referral', async () => {
      await expect(repository.refer(incidentId, referral)).resolves.toBe(true);

      expect(tx.$queryRaw).toHaveBeenCalled();
      expect(tx.fireIncident.update).toHaveBeenCalledWith({
        where: { id: incidentId },
        data: { investigationHandlingOfficeId: 'region-1' },
      });
      expect(tx.investigationReferral.create).toHaveBeenCalledWith({
        data: { fireIncidentId: incidentId, ...referral },
      });
    });

    it.each([
      ['an investigation is open', { _count: { investigations: 1 } }],
      [
        'the case already moved',
        { investigationHandlingOfficeId: 'district-1' },
      ],
      ['the incident was deleted', { deletedAt: new Date() }],
    ])('refuses when %s', async (_label, overrides) => {
      tx.fireIncident.findUnique.mockResolvedValue(lockedIncident(overrides));

      await expect(repository.refer(incidentId, referral)).resolves.toBe(false);
      expect(tx.investigationReferral.create).not.toHaveBeenCalled();
    });
  });

  describe('start', () => {
    const data = {
      incidentNo: '2026-10-NCR-000123',
      conductingOfficeId: 'station-1',
      assignedInvestigatorId: 'investigator-1',
      assignedById: actorId,
    };

    it('numbers the new investigation from the existing count', async () => {
      const numberFor = vi.fn((existing: number) => `INV-x-0${existing + 1}`);

      await repository.start(incidentId, data, numberFor);

      expect(numberFor).toHaveBeenCalledWith(1);
      expect(tx.investigation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          investigationNo: 'INV-x-02',
          fireIncidentId: incidentId,
          conductingOfficeId: 'station-1',
          assignedInvestigatorId: 'investigator-1',
          startedAt: expect.any(Date),
        }),
        select: { id: true, investigationNo: true },
      });
    });

    it('refuses while another investigation is open', async () => {
      tx.fireIncident.findUnique.mockResolvedValue(
        lockedIncident({ _count: { investigations: 1 } }),
      );

      await expect(
        repository.start(incidentId, data, () => 'INV'),
      ).resolves.toBeNull();
      expect(tx.investigation.create).not.toHaveBeenCalled();
    });
  });

  describe('updateDraft', () => {
    it('creates the report as a DRAFT on first save', async () => {
      tx.investigation.findUnique.mockResolvedValue({
        completedAt: null,
        report: null,
      });

      await repository.updateDraft(investigationId, {
        investigation: { originOfFire: 'Kitchen' },
        report: { findings: 'Faulty wiring' },
      });

      expect(tx.investigation.update).toHaveBeenCalledWith({
        where: { id: investigationId },
        data: {
          originOfFire: 'Kitchen',
          report: {
            upsert: {
              create: { findings: 'Faulty wiring', status: 'DRAFT' },
              update: { findings: 'Faulty wiring' },
            },
          },
        },
      });
    });

    it('refuses once the report is submitted', async () => {
      tx.investigation.findUnique.mockResolvedValue({
        completedAt: null,
        report: { status: 'SUBMITTED' },
      });

      await expect(
        repository.updateDraft(investigationId, { investigation: {} }),
      ).resolves.toBe(false);
      expect(tx.investigation.update).not.toHaveBeenCalled();
    });
  });

  it('submits only an editable report of an open investigation', async () => {
    await repository.submitReport(investigationId);

    expect(prisma.investigationReport.updateMany).toHaveBeenCalledWith({
      where: {
        investigationId,
        status: { in: ['DRAFT', 'REJECTED'] },
        investigation: { completedAt: null },
      },
      data: { status: 'SUBMITTED', submittedAt: expect.any(Date) },
    });
  });

  describe('review', () => {
    it('approves: records the review and completes the investigation', async () => {
      await expect(
        repository.review(investigationId, 'APPROVED', actorId, null),
      ).resolves.toBe(true);

      expect(tx.investigationReport.findFirst).toHaveBeenCalledWith({
        where: {
          investigationId,
          status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
          investigation: { completedAt: null },
        },
        select: { id: true },
      });
      expect(tx.investigationReport.update).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        data: {
          status: 'APPROVED',
          reviewedAt: expect.any(Date),
          reviewedById: actorId,
        },
      });
      expect(tx.investigationReportReview.create).toHaveBeenCalledWith({
        data: {
          reportId: 'report-1',
          decision: 'APPROVED',
          reviewerId: actorId,
          remarks: null,
        },
      });
      expect(tx.investigation.update).toHaveBeenCalledWith({
        where: { id: investigationId },
        data: { completedAt: expect.any(Date) },
      });
    });

    it('rejects without completing the investigation', async () => {
      await repository.review(investigationId, 'REJECTED', actorId, 'Missing');

      expect(tx.investigation.update).not.toHaveBeenCalled();
    });

    it('refuses a decision the report is not ready for', async () => {
      tx.investigationReport.findFirst.mockResolvedValue(null);

      await expect(
        repository.review(investigationId, 'UNDER_REVIEW', actorId),
      ).resolves.toBe(false);
      expect(tx.investigationReportReview.create).not.toHaveBeenCalled();
    });
  });
});
