import { Test, TestingModule } from '@nestjs/testing';
import { type UUID } from 'crypto';
import { UsersRepository } from './users.repository.js';
import { PrismaService } from '../../prisma.service.js';
import { type UserInput } from './schema/user.schema.js';
import { type CurrentUserJwtPayload } from '../../types/jwt.payload.js';

const userId = '11111111-1111-4111-8111-111111111111' as UUID;
const officeId = '22222222-2222-4222-8222-222222222222' as UUID;

const newEncoder: UserInput = {
  account_number: 'ENC001',
  rank: 'FO2',
  first_name: 'Juan',
  last_name: 'Dela Cruz',
  email: 'juan@example.com',
  role: 'ENCODER',
  section: 'OPERATIONS',
  sectionDesignationRef: 'SO-2026-118',
  officeId,
  positionId: '44444444-4444-4444-8444-444444444444',
};

const admin = (
  officeType: 'NATIONAL_HEADQUARTERS' | 'REGIONAL_OFFICE',
): CurrentUserJwtPayload => ({
  sub: '33333333-3333-4333-8333-333333333333' as UUID,
  account_number: 'ADMIN001',
  role: 'ADMIN',
  section: null,
  positionId: 'position-1',
  officeId,
  officeType,
});

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let prisma: {
    user: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    office: { findUnique: ReturnType<typeof vi.fn> };
    refreshToken: { deleteMany: ReturnType<typeof vi.fn> };
    auditLog: { create: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        update: vi.fn(),
      },
      office: {
        findUnique: vi.fn().mockResolvedValue({ regionId: 'region-1' }),
      },
      refreshToken: { deleteMany: vi.fn() },
      auditLog: { create: vi.fn() },
      $transaction: vi.fn(),
    };
    prisma.$transaction.mockImplementation((callback) => callback(prisma));

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
      prisma.user.create.mockResolvedValue({ id: userId, ...newEncoder });

      await repository.createUser('hashed-default', newEncoder, 'actor-1');

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...newEncoder,
          password: 'hashed-default',
          mustChangePassword: true,
        }),
        omit: { password: true, failedLoginCount: true, lockedUntil: true },
      });
    });

    it('records the new user without the password', async () => {
      prisma.user.create.mockResolvedValue({ id: userId, ...newEncoder });

      await repository.createUser('hashed-default', newEncoder, 'actor-1');

      const { data } = prisma.auditLog.create.mock.calls[0][0];
      expect(data).toMatchObject({
        actorId: 'actor-1',
        action: 'USER_CREATED',
        entityType: 'USER',
        entityId: userId,
        officeId,
        regionId: 'region-1',
      });
      expect(data.changes).toMatchObject({ role: 'ENCODER', section: 'OPERATIONS' });
      expect(JSON.stringify(data.changes)).not.toContain('hashed-default');
    });
  });

  describe('audit entries', () => {
    const stored = { id: userId, ...newEncoder, isActive: true };

    it('records a section change with its designation reference (FR-USR-004)', async () => {
      prisma.user.findUnique.mockResolvedValue(stored);
      prisma.user.update.mockResolvedValue({
        ...stored,
        section: 'EMS',
        sectionDesignationRef: 'SO-2026-200',
      });

      await repository.editUser(
        userId,
        { ...newEncoder, section: 'EMS', sectionDesignationRef: 'SO-2026-200' },
        'actor-1',
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'USER_UPDATED',
          changes: {
            section: { from: 'OPERATIONS', to: 'EMS' },
            sectionDesignationRef: {
              from: 'SO-2026-118',
              to: 'SO-2026-200',
            },
          },
        }),
      });
    });

    it('writes nothing for an edit that changes nothing', async () => {
      prisma.user.findUnique.mockResolvedValue(stored);
      prisma.user.update.mockResolvedValue(stored);

      await repository.editUser(userId, newEncoder, 'actor-1');

      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('returns null and writes nothing for a missing user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        repository.editUser(userId, newEncoder, 'actor-1'),
      ).resolves.toBeNull();
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('records a deactivation', async () => {
      prisma.user.findUnique.mockResolvedValue({ isActive: true });
      prisma.user.update.mockResolvedValue({ ...stored, isActive: false });

      await repository.deactivateUser(userId, false, 'actor-1');

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'USER_DEACTIVATED',
          changes: { isActive: { from: true, to: false } },
        }),
      });
    });

    it('records a password change with the user as actor and no values', async () => {
      prisma.user.update.mockResolvedValue(stored);

      await repository.changePassowrd('new-hash', userId);

      const { data } = prisma.auditLog.create.mock.calls[0][0];
      expect(data).toMatchObject({
        actorId: userId,
        action: 'USER_PASSWORD_CHANGED',
      });
      expect(data.changes).toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('forces a password change, ends every session and audits without the hash', async () => {
      prisma.user.update.mockResolvedValue({ officeId });

      await repository.resetPassword(userId, 'hashed-default', 'actor-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          password: 'hashed-default',
          mustChangePassword: true,
          failedLoginCount: 0,
          lockedUntil: null,
        },
        select: { officeId: true },
      });
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
      const { data } = prisma.auditLog.create.mock.calls[0][0];
      expect(data.action).toBe('USER_PASSWORD_RESET');
      expect(JSON.stringify(data)).not.toContain('hashed-default');
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
          office: {
            select: { id: true, type: true, parentId: true, regionId: true },
          },
        },
      });
    });
  });

  describe('findPaginatedUsers', () => {
    it('omits the password hash from listed users', async () => {
      await repository.findPaginatedUsers(
        admin('NATIONAL_HEADQUARTERS'),
        '',
        officeId,
        10,
        0,
        'Active',
      );

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          omit: { password: true, failedLoginCount: true, lockedUntil: true },
        }),
      );
    });

    it('limits a regional admin to users in their own office and region', async () => {
      await repository.findPaginatedUsers(
        admin('REGIONAL_OFFICE'),
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

    it('applies no office filter for an NHQ admin', async () => {
      await repository.findPaginatedUsers(
        admin('NATIONAL_HEADQUARTERS'),
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
