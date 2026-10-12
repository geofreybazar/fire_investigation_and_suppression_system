import { Test, TestingModule } from '@nestjs/testing';
import { type UUID } from 'crypto';
import { OfficeRepository } from './office.repository.js';
import { PrismaService } from '../../prisma.service.js';

const officeId = '11111111-1111-4111-8111-111111111111' as UUID;
const nhqId = '22222222-2222-4222-8222-222222222222';
const regionalId = '33333333-3333-4333-8333-333333333333';

describe('OfficeRepository', () => {
  let repository: OfficeRepository;
  let prisma: {
    office: {
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      office: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfficeRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<OfficeRepository>(OfficeRepository);
  });

  describe('createOffice', () => {
    it('saves the region code of a regional office, trimmed and upper-cased', async () => {
      prisma.office.findUnique.mockResolvedValue({
        id: nhqId,
        type: 'NATIONAL_HEADQUARTERS',
        regionId: null,
      });

      await repository.createOffice({
        name: 'Regional Office NCR',
        type: 'REGIONAL_OFFICE',
        parentId: nhqId,
        regionCode: ' ncr ',
      });

      expect(prisma.office.create).toHaveBeenCalledWith({
        data: {
          name: 'Regional Office NCR',
          type: 'REGIONAL_OFFICE',
          parentId: nhqId,
          regionId: null,
          regionCode: 'NCR',
        },
      });
    });

    it('saves a null region code for non-regional offices', async () => {
      prisma.office.findUnique.mockResolvedValue({
        id: regionalId,
        type: 'REGIONAL_OFFICE',
        regionId: null,
      });

      await repository.createOffice({
        name: 'Manila District Fire Station',
        type: 'DISTRICT_FIRE_STATION',
        parentId: regionalId,
        regionCode: '',
      });

      expect(prisma.office.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          regionId: regionalId,
          regionCode: null,
        }),
      });
    });
  });

  describe('updateOffice', () => {
    it('saves the region code on update', async () => {
      prisma.office.findUnique.mockResolvedValue({
        id: nhqId,
        type: 'NATIONAL_HEADQUARTERS',
        regionId: null,
      });

      await repository.updateOffice(officeId, {
        name: 'Regional Office NCR',
        type: 'REGIONAL_OFFICE',
        parentId: nhqId,
        regionCode: 'NCR',
      });

      expect(prisma.office.update).toHaveBeenCalledWith({
        data: expect.objectContaining({ regionCode: 'NCR' }),
        where: { id: officeId },
      });
    });

    it('clears the region code when the office is no longer regional', async () => {
      prisma.office.findUnique.mockResolvedValue({
        id: regionalId,
        type: 'REGIONAL_OFFICE',
        regionId: null,
      });

      await repository.updateOffice(officeId, {
        name: 'Manila District Fire Station',
        type: 'DISTRICT_FIRE_STATION',
        parentId: regionalId,
      });

      expect(prisma.office.update).toHaveBeenCalledWith({
        data: expect.objectContaining({ regionCode: null }),
        where: { id: officeId },
      });
    });
  });

  describe('findByNameUnderParent', () => {
    it('matches the name case-insensitively under the same parent, excluding the office itself', async () => {
      await repository.findByNameUnderParent(
        'quezon city fire station',
        regionalId,
        officeId,
      );

      expect(prisma.office.findFirst).toHaveBeenCalledWith({
        where: {
          name: { equals: 'quezon city fire station', mode: 'insensitive' },
          parentId: regionalId,
          id: { not: officeId },
        },
        select: { id: true },
      });
    });
  });
});
