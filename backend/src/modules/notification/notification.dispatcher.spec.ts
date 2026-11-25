import { Test, TestingModule } from '@nestjs/testing';
import { NotificationDispatcher } from './notification.dispatcher.js';
import { NotificationRepository } from './notification.repository.js';
import { notificationMessages } from './notification.messages.js';

describe('NotificationDispatcher', () => {
  let dispatcher: NotificationDispatcher;
  let repository: {
    findRecipientIds: ReturnType<typeof vi.fn>;
    createNotifications: ReturnType<typeof vi.fn>;
  };

  const event = {
    ...notificationMessages.casualtyDeceased('casualty-1', 'FIR-2027-01-R4A-000001-C01'),
    actorId: 'actor-1',
    recipients: {
      officeIds: ['province-1', 'region-1'],
      roles: ['ADMIN' as const],
    },
  };

  beforeEach(async () => {
    repository = {
      findRecipientIds: vi.fn().mockResolvedValue(['chief-1', 'chief-2']),
      createNotifications: vi.fn().mockResolvedValue({ count: 2 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDispatcher,
        { provide: NotificationRepository, useValue: repository },
      ],
    }).compile();

    dispatcher = module.get<NotificationDispatcher>(NotificationDispatcher);
  });

  it('creates one notification per recipient, checking their preference', async () => {
    await dispatcher.notify(event);

    expect(repository.findRecipientIds).toHaveBeenCalledWith(
      event.recipients,
      'casualtyAlerts',
    );
    expect(repository.createNotifications).toHaveBeenCalledWith(
      ['chief-1', 'chief-2'].map((userId) => ({
        userId,
        type: 'CASUALTY_DECEASED',
        title: event.title,
        body: event.body,
        entityType: 'CASUALTY',
        entityId: 'casualty-1',
      })),
    );
  });

  it('never notifies the user who caused the event', async () => {
    repository.findRecipientIds.mockResolvedValue(['actor-1', 'chief-1']);

    await dispatcher.notify(event);

    expect(repository.createNotifications).toHaveBeenCalledWith([
      expect.objectContaining({ userId: 'chief-1' }),
    ]);
  });

  it('writes nothing when nobody is left to notify', async () => {
    repository.findRecipientIds.mockResolvedValue(['actor-1']);

    await dispatcher.notify(event);

    expect(repository.createNotifications).not.toHaveBeenCalled();
  });

  it('swallows failures so the business change still succeeds', async () => {
    repository.createNotifications.mockRejectedValue(new Error('db down'));

    await expect(dispatcher.notify(event)).resolves.toBeUndefined();
  });

  it('names records by number only, never by person', () => {
    const message = notificationMessages.bfpPersonnelCasualty(
      'casualty-1',
      'EMS-2027-01-R4A-000002-C01',
    );
    expect(message.body).toBe(
      'A BFP personnel casualty was recorded (EMS-2027-01-R4A-000002-C01).',
    );
  });
});
