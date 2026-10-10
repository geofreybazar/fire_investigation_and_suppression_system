import { Test, TestingModule } from '@nestjs/testing';
import { type UUID } from 'crypto';
import { UsersRepository } from './users.repository.js';
import { PrismaService } from '../../prisma.service.js';
import { type UserInput } from './schema/user.schema.js';
import { type CurrentUserJwtPayload } from '../../types/jwt.payload.js';

const userId = '11111111-1111-4111-8111-111111111111' as UUID;
const officeId = '22222222-2222-4222-8222-222222222222' as UUID;

const newInvestigator = {
  account_number: 'INV001',
  rank: 'FO2',
  first_name: 'Juan',
  last_name: 'Dela Cruz',
  email: 'juan@example.com',
  role: 'REGIONAL_INVESTIGATOR',
  officeId,
  positionId: '44444444-4444-4444-8444-444444444444',
} as UserInput;

const admin = (
  role: 'NHQ_ADMIN' | 'REGIONAL_ADMIN',
): CurrentUserJwtPayload => ({
  sub: '33333333-3333-4333-8333-333333333333' as UUID,
  account_number: 'ADMIN001',
  role,
  positionId: 'position-1',
  officeId,
});

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let prisma: {
    user: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<UsersRepository>(UsersRepository);
  });

  describe('createUser', () => {
    it('stores the password hash but omits it from the returned user', async () => {
      await repository.createUser('hashed-default', newInvestigator);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...newInvestigator,
          password: 'hashed-default',
        }),
        omit: { password: true },
      });
    });
  });

  describe('findUserRoleById', () => {
    it('selects only id, role and office scope, without an isActive filter', async () => {
      await repository.findUserRoleById(userId);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          office: { select: { id: true, regionId: true } },
        },
      });
    });
  });

  describe('findPaginatedUsers', () => {
    it('omits the password hash from listed users', async () => {
      await repository.findPaginatedUsers(
        admin('NHQ_ADMIN'),
        '',
        officeId,
        10,
        0,
        'Active',
      );

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ omit: { password: true } }),
      );
    });

    it('limits REGIONAL_ADMIN to users in their own office and region', async () => {
      await repository.findPaginatedUsers(
        admin('REGIONAL_ADMIN'),
        '',
        '' as UUID,
        10,
        0,
        'Active',
      );

      const regionFilter = {
        OR: [{ id: officeId }, { regionId: officeId }],
      };
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ office: regionFilter }),
        }),
      );
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ office: regionFilter }),
      });
    });

    it('applies no region filter for NHQ_ADMIN', async () => {
      await repository.findPaginatedUsers(
        admin('NHQ_ADMIN'),
        '',
        '' as UUID,
        10,
        0,
        'Active',
      );

      const { where } = prisma.user.findMany.mock.calls[0][0];
      expect(where).not.toHaveProperty('office');
    });
  });
});
