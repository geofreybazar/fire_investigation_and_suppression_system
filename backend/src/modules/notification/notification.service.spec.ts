import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { type UUID } from 'crypto';
import { NotificationService } from './notification.service.js';
import { NotificationRepository } from './notification.repository.js';
import { type NotificationInput } from './schema/notification.schema.js';
import { type CurrentUserJwtPayload } from '../../types/jwt.payload.js';

const userId = '11111111-1111-4111-8111-111111111111' as UUID;
const otherUserId = '55555555-5555-4555-8555-555555555555' as UUID;

const currentUser: CurrentUserJwtPayload = {
  sub: userId,
  account_number: 'ACC001',
  role: 'REGIONAL_INVESTIGATOR',
  positionId: 'position-1',
  officeId: 'office-1',
};

describe('NotificationService', () => {
  let service: NotificationService;
  let repository: {
    getUserNotificationSettings: ReturnType<typeof vi.fn>;
    updateNotificationSettings: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repository = {
      getUserNotificationSettings: vi.fn(),
      updateNotificationSettings: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: NotificationRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserNotificationSettings', () => {
    it('returns the settings for the user', async () => {
      const settings = { id: 'settings-1', userId };
      repository.getUserNotificationSettings.mockResolvedValue(settings);

      await expect(
        service.getUserNotificationSettings(userId, currentUser),
      ).resolves.toBe(settings);
      expect(repository.getUserNotificationSettings).toHaveBeenCalledWith(
        userId,
      );
    });

    it('throws NotFoundException when no settings exist', async () => {
      repository.getUserNotificationSettings.mockResolvedValue(null);

      await expect(
        service.getUserNotificationSettings(userId, currentUser),
      ).rejects.toThrow(NotFoundException);
    });

    it("forbids reading another user's settings", async () => {
      await expect(
        service.getUserNotificationSettings(otherUserId, currentUser),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.getUserNotificationSettings).not.toHaveBeenCalled();
    });
  });

  describe('updateNotificationSettings', () => {
    it('passes the update through to the repository', async () => {
      const input = {} as NotificationInput;

      await expect(
        service.updateNotificationSettings(userId, input, currentUser),
      ).resolves.toBeUndefined();
      expect(repository.updateNotificationSettings).toHaveBeenCalledWith(
        userId,
        input,
      );
    });

    it("forbids changing another user's settings", async () => {
      await expect(
        service.updateNotificationSettings(
          otherUserId,
          {} as NotificationInput,
          currentUser,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.updateNotificationSettings).not.toHaveBeenCalled();
    });
  });
});
