import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';
import { OfficeRepository } from '../office/office.repository.js';
import { ConfigService } from '@nestjs/config';
import { UUID } from 'crypto';
import { CurrentUserJwtPayload } from '../../types/jwt.payload.js';
import { UserInput } from './schema/user.schema.js';
import { ForbiddenException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;

  const mockUsersRepository = {
    findUserById: vi.fn(),
    createUser: vi.fn(),
  };

  const mockOfficeRepository = {
    findById: vi.fn(),
  };

  const mockConfigService = {
    get: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: mockUsersRepository,
        },

        {
          provide: OfficeRepository,
          useValue: mockOfficeRepository,
        },

        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUser', () => {
    it('should return user without password', async () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        password: 'hashed-password',
      };

      mockUsersRepository.findUserById.mockResolvedValue(user);

      const result = await service.getUser('123' as UUID);

      expect(mockUsersRepository.findUserById).toHaveBeenCalledWith('123');

      expect(result).toEqual({
        id: '123',
        email: 'test@example.com',
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUsersRepository.findUserById.mockResolvedValue(null);

      await expect(service.getUser('123' as any)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('createUser', () => {
    it('should create and return new user', async () => {
      const currentUser = {
        role: 'REGIONAL_ADMIN',
      } as CurrentUserJwtPayload;

      const userData = {
        account_number: 'B13084',
        rank: 'SFO1',
        first_name: 'Geofrey',
        last_name: 'Smith',
        middle_name: 'John',
        email: 'geofrey.smith@example.com',
        role: 'REGIONAL_ADMIN',
        officeId: 'off123',
        positionId: 'pos123',
      } as UserInput;

      const office = {
        id: 'off123',
        type: 'REGIONAL_OFFICE',
      };

      const createdUser = {
        id: 'user123',
        ...userData,
      };

      mockOfficeRepository.findById.mockResolvedValue(office);

      mockConfigService.get.mockReturnValue('DefaultPassword123');

      mockUsersRepository.createUser.mockResolvedValue(createdUser);

      const result = await service.createUser(userData, currentUser);

      expect(mockOfficeRepository.findById).toHaveBeenCalledWith(
        userData.officeId,
      );

      expect(mockConfigService.get).toHaveBeenCalledWith('defaultPassword');

      expect(mockUsersRepository.createUser).toHaveBeenCalled();

      expect(result).toEqual(createdUser);
    });

    it('should throw ForbiddenException when user is not allowed to create the target role', async () => {
      const currentUser = {
        role: 'REGIONAL_VIEWER',
      } as CurrentUserJwtPayload;

      const userData = {
        account_number: 'B13084',
        rank: 'SFO1',
        first_name: 'Geofrey',
        last_name: 'Smith',
        middle_name: 'John',
        email: 'geofrey.smith@example.com',
        role: 'REGIONAL_ADMIN',
        officeId: 'off123',
        positionId: 'pos123',
      } as UserInput;

      await expect(service.createUser(userData, currentUser)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockOfficeRepository.findById).not.toHaveBeenCalled();

      expect(mockUsersRepository.createUser).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when office does not exist', async () => {
      const currentUser = {
        role: 'REGIONAL_ADMIN',
      } as CurrentUserJwtPayload;

      const userData = {
        account_number: 'B13084',
        rank: 'SFO1',
        first_name: 'Geofrey',
        last_name: 'Smith',
        middle_name: 'John',
        email: 'geofrey.smith@example.com',
        role: 'REGIONAL_ADMIN',
        officeId: 'off123',
        positionId: 'pos123',
      } as UserInput;

      mockOfficeRepository.findById.mockResolvedValue(null);

      await expect(service.createUser(userData, currentUser)).rejects.toThrow(
        'Selected office not found',
      );

      expect(mockUsersRepository.createUser).not.toHaveBeenCalled();
    });
  });
});
