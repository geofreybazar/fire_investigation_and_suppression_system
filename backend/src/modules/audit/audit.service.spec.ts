import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { type UUID } from 'crypto';
import { AuditService } from './audit.service.js';
import { AuditRepository } from './audit.repository.js';
import { type CurrentUserJwtPayload } from '../../types/jwt.payload.js';

const regionalOfficeId = 'region-1';

const user = (
  role: CurrentUserJwtPayload['role'],
  officeType: CurrentUserJwtPayload['officeType'] = 'REGIONAL_OFFICE',
  officeId = regionalOfficeId,
): CurrentUserJwtPayload => ({
  sub: '11111111-1111-4111-8111-111111111111' as UUID,
  account_number: 'ADMIN001',
  role,
  section: null,
  positionId: 'position-1',
  officeId,
  officeType,
});

describe('AuditService', () => {
  let service: AuditService;
  let repository: {
    findPaginated: ReturnType<typeof vi.fn>;
    findChildOfficeIds: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repository = {
      findPaginated: vi.fn().mockResolvedValue({ auditLogs: [], total: 0 }),
      findChildOfficeIds: vi.fn().mockResolvedValue(['station-1', 'station-2']),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: AuditRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  const scopeFor = async (actor: CurrentUserJwtPayload) => {
    await service.findPaginated({ page: 1 }, actor);
    return repository.findPaginated.mock.calls[0][0].AND[0];
  };

  it('lets SUPER_ADMIN read every entry', async () => {
    await expect(
      scopeFor(user('SUPER_ADMIN', 'NATIONAL_HEADQUARTERS', 'nhq')),
    ).resolves.toEqual({});
  });

  it('lets an NHQ admin read every entry (national)', async () => {
    await expect(
      scopeFor(user('ADMIN', 'NATIONAL_HEADQUARTERS', 'nhq')),
    ).resolves.toEqual({});
  });

  it('limits a regional admin to its region plus its own actions', async () => {
    const actor = user('ADMIN');

    await expect(scopeFor(actor)).resolves.toEqual({
      OR: [
        { officeId: regionalOfficeId },
        { regionId: regionalOfficeId },
        { actorId: actor.sub },
      ],
    });
  });

  it('limits a provincial admin to its office and stations plus its own actions', async () => {
    const actor = user('ADMIN', 'PROVINCIAL_FIRE_STATION', 'province-1');

    await expect(scopeFor(actor)).resolves.toEqual({
      OR: [
        { officeId: { in: ['province-1', 'station-1', 'station-2'] } },
        { actorId: actor.sub },
      ],
    });
    expect(repository.findChildOfficeIds).toHaveBeenCalledWith('province-1');
  });

  it('limits a station admin to its own office plus its own actions', async () => {
    const actor = user('ADMIN', 'CITY_FIRE_STATION', 'station-1');

    await expect(scopeFor(actor)).resolves.toEqual({
      OR: [{ officeId: 'station-1' }, { actorId: actor.sub }],
    });
  });

  it('forbids encoders and viewers', async () => {
    for (const actor of [
      user('VIEWER', 'NATIONAL_HEADQUARTERS', 'nhq'),
      user('ENCODER', 'CITY_FIRE_STATION', 'station-1'),
    ]) {
      await expect(service.findPaginated({ page: 1 }, actor)).rejects.toThrow(
        ForbiddenException,
      );
    }
    expect(repository.findPaginated).not.toHaveBeenCalled();
  });

  it('applies the filters and paginates by 20', async () => {
    repository.findPaginated.mockResolvedValue({ auditLogs: [], total: 45 });
    const from = new Date('2026-10-01T00:00:00.000Z');

    const result = await service.findPaginated(
      { page: 3, action: 'USER_UPDATED', entityType: 'USER', from },
      user('SUPER_ADMIN', 'NATIONAL_HEADQUARTERS', 'nhq'),
    );

    expect(repository.findPaginated).toHaveBeenCalledWith(
      {
        AND: [
          {},
          {
            action: 'USER_UPDATED',
            entityType: 'USER',
            createdAt: { gte: from },
          },
        ],
      },
      40,
      20,
    );
    expect(result.pagination).toEqual({
      page: 3,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
  });
});
