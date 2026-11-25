import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
import { type UUID } from 'crypto';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';
import { OfficeRepository } from '../office/office.repository.js';
import { UsersAuthorizationService } from './service/users.authorization.service.js';
import { type UserInput } from './schema/user.schema.js';
import { type CurrentUserJwtPayload } from '../../types/jwt.payload.js';

vi.mock('bcrypt', () => ({
  default: { hash: vi.fn(), compare: vi.fn() },
}));

const userId = '11111111-1111-4111-8111-111111111111' as UUID;

// NHQ → Region A → Province A → Station A1; Station B1 is in another region.
const nhq = {
  id: 'nhq',
  type: 'NATIONAL_HEADQUARTERS',
  parentId: null,
  regionId: null,
} as const;
const regionA = {
  id: 'region-a',
  type: 'REGIONAL_OFFICE',
  parentId: 'nhq',
  regionId: null,
} as const;
const stationA1 = {
  id: 'station-a1',
  type: 'CITY_FIRE_STATION',
  parentId: 'province-a',
  regionId: 'region-a',
} as const;
const stationB1 = {
  id: 'station-b1',
  type: 'MUNICIPAL_FIRE_STATION',
  parentId: 'province-b',
  regionId: 'region-b',
} as const;

const superAdmin: CurrentUserJwtPayload = {
  sub: '33333333-3333-4333-8333-333333333333' as UUID,
  account_number: 'ADMIN001',
  role: 'SUPER_ADMIN',
  section: null,
  positionId: 'position-1',
  officeId: nhq.id,
  officeType: nhq.type,
};

const regionalAdmin: CurrentUserJwtPayload = {
  ...superAdmin,
  role: 'ADMIN',
  officeId: regionA.id,
  officeType: regionA.type,
};

const stationAdmin: CurrentUserJwtPayload = {
  ...superAdmin,
  role: 'ADMIN',
  officeId: stationA1.id,
  officeType: stationA1.type,
};

const encoder: CurrentUserJwtPayload = {
  ...stationAdmin,
  role: 'ENCODER',
  section: 'EMS',
};

const newEncoder: UserInput = {
  account_number: 'ENC001',
  rank: 'FO2',
  first_name: 'Juan',
  last_name: 'Dela Cruz',
  email: 'juan@example.com',
  role: 'ENCODER',
  section: 'EMS',
  sectionDesignationRef: 'SO-2026-118',
  officeId: stationA1.id,
  positionId: '44444444-4444-4444-8444-444444444444',
};

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: Record<string, ReturnType<typeof vi.fn>>;
  let officeRepository: { findById: ReturnType<typeof vi.fn> };
  let configService: { get: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.mocked(bcrypt.hash).mockReset();
    vi.mocked(bcrypt.compare).mockReset();

    usersRepository = {
      createUser: vi.fn(),
      findUserById: vi.fn(),
      // By default the target is an EMS encoder of station A1.
      findUserRoleById: vi.fn().mockResolvedValue({
        id: userId,
        role: 'ENCODER',
        office: stationA1,
      }),
      findUserForChangePassword: vi.fn(),
      changePassowrd: vi.fn(),
      resetPassword: vi.fn(),
      findPaginatedUsers: vi.fn(),
      deactivateUser: vi.fn(),
      editUser: vi.fn(),
    };
    officeRepository = {
      findById: vi.fn(async (id: string) =>
        [nhq, regionA, stationA1, stationB1].find((office) => office.id === id) ??
        null,
      ),
    };
    configService = { get: vi.fn().mockReturnValue('DefaultPass123!') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: usersRepository },
        { provide: OfficeRepository, useValue: officeRepository },
        { provide: ConfigService, useValue: configService },
        // Real service, so the assignment rules are exercised end to end.
        UsersAuthorizationService,
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('createUser', () => {
    it('hashes the default password and creates the user', async () => {
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-default' as never);
      const created = { id: userId, ...newEncoder };
      usersRepository.createUser.mockResolvedValue(created);

      await expect(service.createUser(newEncoder, stationAdmin)).resolves.toBe(
        created,
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('DefaultPass123!', 10);
      expect(usersRepository.createUser).toHaveBeenCalledWith(
        'hashed-default',
        newEncoder,
        stationAdmin.sub,
      );
    });

    it('refuses SUPER_ADMIN, whoever asks', async () => {
      await expect(
        service.createUser(
          { ...newEncoder, role: 'SUPER_ADMIN', section: null, officeId: nhq.id },
          superAdmin,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(usersRepository.createUser).not.toHaveBeenCalled();
    });

    it('refuses an office outside the admin’s jurisdiction', async () => {
      await expect(
        service.createUser({ ...newEncoder, officeId: stationB1.id }, regionalAdmin),
      ).rejects.toThrow(ForbiddenException);
      expect(usersRepository.createUser).not.toHaveBeenCalled();
    });

    it('refuses an encoder above station level', async () => {
      await expect(
        service.createUser({ ...newEncoder, officeId: regionA.id }, superAdmin),
      ).rejects.toThrow(ForbiddenException);
    });

    it('requires a section for encoders (400)', async () => {
      await expect(
        service.createUser({ ...newEncoder, section: null }, stationAdmin),
      ).rejects.toThrow(BadRequestException);
      expect(usersRepository.createUser).not.toHaveBeenCalled();
    });

    it('refuses a section on admin accounts (400)', async () => {
      await expect(
        service.createUser(
          { ...newEncoder, role: 'ADMIN', section: 'SRF' },
          regionalAdmin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuses an unknown office (404)', async () => {
      await expect(
        service.createUser({ ...newEncoder, officeId: 'missing' }, superAdmin),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUser', () => {
    const storedUser = {
      id: userId,
      role: 'ENCODER',
      office: stationA1,
      password: 'hash',
      failedLoginCount: 2,
      lockedUntil: null,
    };

    it('returns the user’s own profile without login fields', async () => {
      usersRepository.findUserById.mockResolvedValue(storedUser);

      const result = await service.getUser(userId, {
        ...encoder,
        sub: userId,
      });

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('failedLoginCount');
      expect(result).not.toHaveProperty('lockedUntil');
    });

    it('refuses non-admins reading someone else, before any lookup', async () => {
      await expect(service.getUser(userId, encoder)).rejects.toThrow(
        ForbiddenException,
      );
      expect(usersRepository.findUserById).not.toHaveBeenCalled();
    });

    it('lets an admin read an account they manage', async () => {
      usersRepository.findUserById.mockResolvedValue(storedUser);
      await expect(service.getUser(userId, regionalAdmin)).resolves.toMatchObject({
        id: userId,
      });
    });

    it('refuses an admin outside the account’s jurisdiction', async () => {
      usersRepository.findUserById.mockResolvedValue({
        ...storedUser,
        office: stationB1,
      });
      await expect(service.getUser(userId, regionalAdmin)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('changePassword', () => {
    const passwordData = {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword456!',
    };

    it('stores a hash of the new password when the current one matches', async () => {
      usersRepository.findUserForChangePassword.mockResolvedValue({
        id: userId,
        password: 'old-hash',
      });
      vi.mocked(bcrypt.compare)
        .mockResolvedValueOnce(true as never)
        .mockResolvedValueOnce(false as never);
      vi.mocked(bcrypt.hash).mockResolvedValue('new-hash' as never);

      await expect(
        service.changePassword(passwordData, userId),
      ).resolves.toBeUndefined();
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'OldPassword123!',
        'old-hash',
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword456!', 10);
      expect(usersRepository.changePassowrd).toHaveBeenCalledWith(
        'new-hash',
        userId,
      );
    });

    it('refuses a new password equal to the current one', async () => {
      usersRepository.findUserForChangePassword.mockResolvedValue({
        id: userId,
        password: 'old-hash',
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      await expect(
        service.changePassword(passwordData, userId),
      ).rejects.toThrow('different from the current one');
      expect(usersRepository.changePassowrd).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the current password is wrong', async () => {
      usersRepository.findUserForChangePassword.mockResolvedValue({
        id: userId,
        password: 'old-hash',
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        service.changePassword(passwordData, userId),
      ).rejects.toThrow(BadRequestException);
      expect(usersRepository.changePassowrd).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the user does not exist', async () => {
      usersRepository.findUserForChangePassword.mockResolvedValue(null);

      await expect(
        service.changePassword(passwordData, userId),
      ).rejects.toThrow(UnauthorizedException);
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(usersRepository.changePassowrd).not.toHaveBeenCalled();
    });
  });


  describe('resetPassword', () => {
    it('resets to the default password for an account the admin manages', async () => {
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-default' as never);

      await expect(service.resetPassword(userId, stationAdmin)).resolves.toEqual({
        message: expect.stringContaining('must change'),
      });
      expect(usersRepository.resetPassword).toHaveBeenCalledWith(
        userId,
        'hashed-default',
        stationAdmin.sub,
      );
    });

    it('refuses resetting one’s own password', async () => {
      await expect(
        service.resetPassword(stationAdmin.sub, stationAdmin),
      ).rejects.toThrow(ForbiddenException);
    });

    it('refuses accounts outside the admin’s authority', async () => {
      usersRepository.findUserRoleById.mockResolvedValue({
        id: userId,
        role: 'ENCODER',
        office: stationB1,
      });
      await expect(service.resetPassword(userId, regionalAdmin)).rejects.toThrow(
        ForbiddenException,
      );
      expect(usersRepository.resetPassword).not.toHaveBeenCalled();
    });
  });

  describe('findPaginatedUsers', () => {
    it('refuses users without USER_MANAGE', async () => {
      await expect(
        service.findPaginatedUsers(encoder, 1, '', '' as UUID, 'Active'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns a page with pagination info', async () => {
      usersRepository.findPaginatedUsers.mockResolvedValue({
        personnel: [{ id: userId }],
        total: 11,
      });

      await expect(
        service.findPaginatedUsers(regionalAdmin, 2, '', '' as UUID, 'Active'),
      ).resolves.toEqual({
        data: [{ id: userId }],
        pagination: { page: 2, limit: 10, total: 11, totalPages: 2 },
      });
    });
  });

  describe('changeUserStatus', () => {
    it('deactivates an account the admin manages', async () => {
      usersRepository.deactivateUser.mockResolvedValue({ id: userId });

      await expect(
        service.changeUserStatus(userId, { isActive: false }, stationAdmin),
      ).resolves.toEqual({ message: 'User deactivated successfully.' });
      expect(usersRepository.deactivateUser).toHaveBeenCalledWith(
        userId,
        false,
        stationAdmin.sub,
      );
    });

    it('refuses deactivating oneself', async () => {
      await expect(
        service.changeUserStatus(
          stationAdmin.sub,
          { isActive: false },
          stationAdmin,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('refuses when the target is missing (404)', async () => {
      usersRepository.findUserRoleById.mockResolvedValue(null);
      await expect(
        service.changeUserStatus(userId, { isActive: true }, superAdmin),
      ).rejects.toThrow(NotFoundException);
    });

    it('refuses a station admin managing another station admin', async () => {
      usersRepository.findUserRoleById.mockResolvedValue({
        id: userId,
        role: 'ADMIN',
        office: stationA1,
      });
      await expect(
        service.changeUserStatus(userId, { isActive: false }, stationAdmin),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('editUser', () => {
    it('moves an encoder to another section', async () => {
      usersRepository.editUser.mockResolvedValue({ id: userId });
      const change = { ...newEncoder, section: 'SRF' as const };

      await expect(service.editUser(userId, change, stationAdmin)).resolves.toEqual(
        { message: 'user successfully updated' },
      );
      expect(usersRepository.editUser).toHaveBeenCalledWith(
        userId,
        change,
        stationAdmin.sub,
      );
    });

    it('refuses promoting to a role the admin cannot grant', async () => {
      await expect(
        service.editUser(
          userId,
          { ...newEncoder, role: 'ADMIN', section: null },
          stationAdmin,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(usersRepository.editUser).not.toHaveBeenCalled();
    });

    it('refuses moving an account out of the admin’s jurisdiction', async () => {
      await expect(
        service.editUser(
          userId,
          { ...newEncoder, officeId: stationB1.id },
          regionalAdmin,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('keeps the SUPER_ADMIN account’s role and office', async () => {
      usersRepository.findUserRoleById.mockResolvedValue({
        id: userId,
        role: 'SUPER_ADMIN',
        office: nhq,
      });

      await expect(
        service.editUser(
          userId,
          { ...newEncoder, role: 'ADMIN', section: null, officeId: nhq.id },
          superAdmin,
        ),
      ).rejects.toThrow(ForbiddenException);

      usersRepository.editUser.mockResolvedValue({ id: userId });
      await expect(
        service.editUser(
          userId,
          {
            ...newEncoder,
            role: 'SUPER_ADMIN',
            section: null,
            officeId: nhq.id,
          },
          superAdmin,
        ),
      ).resolves.toEqual({ message: 'user successfully updated' });
    });
  });
});
