import { randomUUID } from 'crypto';
import { HttpAdapterHost } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types.js';

import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma.service.js';
import { PrismaExceptionFilter } from './../src/common/filters/prisma-exception.filter.js';
import { Section, UserRole } from './../src/generated/prisma/enums.js';
import { NotificationDispatcher } from './../src/modules/notification/notification.dispatcher.js';
import { notificationMessages } from './../src/modules/notification/notification.messages.js';

// Runs against the database in .env. Every record it creates carries a unique
// suffix and is deleted in afterAll, so existing data is never touched.

const suffix = randomUUID().slice(0, 6).toUpperCase();
const password = 'E2e-Password-123!';

interface Account {
  id: string;
  cookie: string;
}

describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const officeIds: string[] = [];
  const userIds: string[] = [];
  let positionId: string;
  let stationId: string;

  let staff: Account;
  let chief: Account;
  let mutedChief: Account;

  const server = () => app.getHttpServer();

  async function createAccount(
    tag: string,
    role: UserRole,
    section: Section | null,
    notifications?: { casualtyAlerts: boolean },
  ): Promise<Account> {
    const accountNumber = `E3${tag}${suffix}`.slice(0, 10);
    const user = await prisma.user.create({
      data: {
        email: `e2e-${tag.toLowerCase()}-${suffix.toLowerCase()}@example.test`,
        account_number: accountNumber,
        rank: 'FO1',
        first_name: 'E2E',
        last_name: tag,
        password: await bcrypt.hash(password, 10),
        role,
        section,
        officeId: stationId,
        positionId,
        notification: { create: notifications ?? {} },
      },
    });
    userIds.push(user.id);

    const response = await request(server())
      .post('/api/auth/login')
      .send({ account_number: accountNumber, password })
      .expect(201);
    const cookies = response.headers['set-cookie'] as unknown as string[];

    return {
      id: user.id,
      cookie: cookies.map((cookie) => cookie.split(';')[0]).join('; '),
    };
  }

  const inbox = async (account: Account) => {
    const response = await request(server())
      .get('/api/notification/inbox')
      .set('Cookie', account.cookie)
      .expect(200);
    return response.body.data as {
      id: string;
      type: string;
      entityId: string;
      readAt: string | null;
    }[];
  };

  const unread = async (account: Account) => {
    const response = await request(server())
      .get('/api/notification/unread-count')
      .set('Cookie', account.cookie)
      .expect(200);
    return response.body.unread as number;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Same bootstrap as main.ts.
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    app.useGlobalFilters(
      new PrismaExceptionFilter(app.get(HttpAdapterHost).httpAdapter),
    );
    await app.init();

    prisma = app.get(PrismaService);

    positionId = (
      await prisma.position.create({
        data: { name: `E2E Notify Position ${suffix}` },
      })
    ).id;

    const create = async (
      data: Parameters<typeof prisma.office.create>[0]['data'],
    ) => {
      const office = await prisma.office.create({ data });
      officeIds.unshift(office.id); // children are deleted before parents
      return office.id;
    };
    const nhq = await create({
      name: `E2E Notify NHQ ${suffix}`,
      type: 'NATIONAL_HEADQUARTERS',
    });
    const region = await create({
      name: `E2E Notify Region ${suffix}`,
      type: 'REGIONAL_OFFICE',
      parentId: nhq,
      regionCode: `EN${suffix}`,
    });
    const district = await create({
      name: `E2E Notify District ${suffix}`,
      type: 'DISTRICT_FIRE_STATION',
      parentId: region,
      regionId: region,
    });
    stationId = await create({
      name: `E2E Notify Station ${suffix}`,
      type: 'CITY_FIRE_STATION',
      parentId: district,
      regionId: region,
    });

    staff = await createAccount('ST', 'ENCODER', 'OPERATIONS');
    chief = await createAccount('CH', 'ADMIN', null);
    mutedChief = await createAccount('MU', 'ADMIN', null, {
      casualtyAlerts: false,
    });
  });

  afterAll(async () => {
    // Notifications cascade with their users.
    await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.position.deleteMany({ where: { id: positionId } });
    for (const id of officeIds) {
      await prisma.office.deleteMany({ where: { id } });
    }
    await app.close();
  });

  it('delivers to the recipient roles of the offices, honoring preferences and skipping the actor', async () => {
    await app.get(NotificationDispatcher).notify({
      ...notificationMessages.casualtyDeceased('casualty-1', `C-${suffix}`),
      actorId: staff.id,
      recipients: { officeIds: [stationId], roles: ['ADMIN', 'ENCODER'] },
    });

    // The admin gets it; the admin who turned casualty alerts off and the
    // encoder who caused it do not.
    await expect(inbox(chief)).resolves.toMatchObject([
      { type: 'CASUALTY_DECEASED', entityId: 'casualty-1', readAt: null },
    ]);
    await expect(inbox(mutedChief)).resolves.toHaveLength(0);
    await expect(inbox(staff)).resolves.toHaveLength(0);
  });

  it('marks notifications read, only for their owner', async () => {
    const [notification] = await inbox(chief);
    expect(await unread(chief)).toBe(1);

    // Someone else's notification looks like a missing one.
    await request(server())
      .post(`/api/notification/${notification.id}/read`)
      .set('Cookie', staff.cookie)
      .expect(404);
    expect(await unread(chief)).toBe(1);

    await request(server())
      .post(`/api/notification/${notification.id}/read`)
      .set('Cookie', chief.cookie)
      .expect(201);
    expect(await unread(chief)).toBe(0);

    await request(server())
      .post('/api/notification/read-all')
      .set('Cookie', staff.cookie)
      .expect(201);
    expect(await unread(staff)).toBe(0);
  });

  it('still serves the settings route next to the inbox routes', async () => {
    const response = await request(server())
      .get(`/api/notification/${chief.id}`)
      .set('Cookie', chief.cookie)
      .expect(200);

    expect(response.body).toMatchObject({
      casualtyAlerts: true,
      recordCorrections: true,
    });
  });
});
