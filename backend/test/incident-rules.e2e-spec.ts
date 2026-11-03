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
import { ROLE } from './../src/generated/prisma/enums.js';

// Q-50 and Q-51. Runs against the database in .env; everything it creates is
// deleted in afterAll.

const suffix = randomUUID().slice(0, 6).toUpperCase();
const password = 'E2e-Password-123!';

describe('Incident rules (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const officeIds: string[] = [];
  const userIds: string[] = [];
  const incidentIds: string[] = [];
  let positionId: string;
  let categoryId: string;
  let districtA: string;
  let districtB: string;
  let station: string;
  let submitterId: string;
  let investigatorId: string;

  const cookies: Record<string, string> = {};
  const server = () => app.getHttpServer();

  async function office(
    data: Parameters<typeof prisma.office.create>[0]['data'],
  ) {
    const created = await prisma.office.create({ data });
    officeIds.unshift(created.id); // children are deleted before parents
    return created.id;
  }

  async function account(tag: string, role: ROLE, officeId: string) {
    const accountNumber = `E6${tag}${suffix}`.slice(0, 10);
    const user = await prisma.user.create({
      data: {
        email: `e2e-rules-${tag.toLowerCase()}-${suffix.toLowerCase()}@example.test`,
        account_number: accountNumber,
        rank: 'FO1',
        first_name: 'E2E',
        last_name: tag,
        password: await bcrypt.hash(password, 10),
        role,
        officeId,
        positionId,
      },
    });
    userIds.push(user.id);

    const response = await request(server())
      .post('/api/auth/login')
      .send({ account_number: accountNumber, password })
      .expect(201);
    cookies[tag] = (response.headers['set-cookie'] as unknown as string[])
      .map((cookie) => cookie.split(';')[0])
      .join('; ');
    return user.id;
  }

  async function incident(data: {
    approvalStatus: 'APPROVED' | 'REJECTED';
    investigationHandlingOfficeId?: string;
  }) {
    const number = incidentIds.length + 1;
    const created = await prisma.fireIncident.create({
      data: {
        incidentNo:
          data.approvalStatus === 'APPROVED'
            ? `E2E-R-${suffix}-${number}`
            : null,
        fireIncidentStatus: 'FIRE_OUT',
        categoryId,
        officeId: station,
        createdById: submitterId,
        ...data,
        location: {
          create: {
            placeOfOccurence: '12 Rizal St.',
            barangay: 'San Isidro',
            region: 'Region',
            province_district: 'District',
            city_municipality: 'City',
          },
        },
      },
    });
    incidentIds.push(created.id);
    return created;
  }

  const investigation = (fireIncidentId: string, completedAt: Date | null) =>
    prisma.investigation.create({
      data: {
        investigationNo: `INV-E2E-${randomUUID()}`,
        startedAt: new Date(),
        completedAt,
        fireIncidentId,
        conductingOfficeId: districtA,
        assignedInvestigatorId: investigatorId,
        assignedById: investigatorId,
      },
    });

  const moveStation = (parentId: string) =>
    request(server())
      .patch(`/api/office_api/${station}`)
      .set('Cookie', cookies.AD)
      .send({
        name: `E2E Rules Station ${suffix}`,
        type: 'CITY_FIRE_STATION',
        parentId,
      });

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
        data: { name: `E2E Rules Position ${suffix}` },
      })
    ).id;
    categoryId = (
      await prisma.fireIncidentCategory.create({
        data: { name: `E2E Rules Category ${suffix}`, type: 'STRUCTURAL' },
      })
    ).id;

    const nhq = await office({
      name: `E2E Rules NHQ ${suffix}`,
      type: 'NATIONAL_HEADQUARTERS',
    });
    const region = await office({
      name: `E2E Rules Region ${suffix}`,
      type: 'REGIONAL_OFFICE',
      parentId: nhq,
    });
    const district = (tag: string) =>
      office({
        name: `E2E Rules District ${tag} ${suffix}`,
        type: 'DISTRICT_FIRE_STATION',
        parentId: region,
        regionId: region,
      });
    districtA = await district('A');
    districtB = await district('B');
    station = await office({
      name: `E2E Rules Station ${suffix}`,
      type: 'CITY_FIRE_STATION',
      parentId: districtA,
      regionId: region,
    });

    await account('AD', 'NHQ_ADMIN', nhq);
    submitterId = await account(
      'SU',
      'CITY_MUNICIPALITY_OPERATION_STAFF',
      station,
    );
    await account('CO', 'CITY_MUNICIPALITY_COMMEL', station);
    investigatorId = await account(
      'IV',
      'DISTRICT_PROVINCE_INVESTIGATOR',
      districtA,
    );
  });

  afterAll(async () => {
    // The location restricts incident deletion (REQUIREMENTS.md D-05);
    // investigations and referrals cascade with the incident.
    await prisma.incidentLocation.deleteMany({
      where: { fireIncidentId: { in: incidentIds } },
    });
    await prisma.fireIncident.deleteMany({
      where: { id: { in: incidentIds } },
    });
    await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.fireIncidentCategory.deleteMany({ where: { id: categoryId } });
    await prisma.position.deleteMany({ where: { id: positionId } });
    for (const id of officeIds) {
      await prisma.office.deleteMany({ where: { id } });
    }
    await app.close();
  });

  describe('rejected incidents (Q-50)', () => {
    it('lets only the submitter resubmit', async () => {
      const { id } = await incident({ approvalStatus: 'REJECTED' });

      await request(server())
        .post(`/api/fire-incident/${id}/resubmit`)
        .set('Cookie', cookies.CO)
        .expect(403);
      await request(server())
        .post(`/api/fire-incident/${id}/resubmit`)
        .set('Cookie', cookies.SU)
        .expect(201);
    });

    it('stops a colleague attaching a file', async () => {
      const { id } = await incident({ approvalStatus: 'REJECTED' });

      await request(server())
        .post(`/api/attachments/incident/${id}`)
        .set('Cookie', cookies.CO)
        .attach('file', Buffer.from('%PDF-1.7\n'), 'scene.pdf')
        .expect(403);
    });
  });

  describe('moving a station (Q-51)', () => {
    it('blocks the move while a referred case is unfinished, then allows it once finished', async () => {
      const blocked = await incident({
        approvalStatus: 'APPROVED',
        investigationHandlingOfficeId: districtA,
      });
      const open = await investigation(blocked.id, null);

      const refused = await moveStation(districtB).expect(409);
      expect(refused.body.message).toContain(blocked.incidentNo);
      expect(
        (await prisma.office.findUnique({ where: { id: station } }))?.parentId,
      ).toBe(districtA);

      await prisma.investigation.update({
        where: { id: open.id },
        data: { completedAt: new Date() },
      });

      await moveStation(districtB).expect(200);

      const moved = await prisma.fireIncident.findUnique({
        where: { id: blocked.id },
        include: { referrals: true },
      });
      expect(moved?.investigationHandlingOfficeId).toBe(station);
      expect(moved?.referrals).toEqual([
        expect.objectContaining({
          fromOfficeId: districtA,
          toOfficeId: station,
          direction: 'DOWN',
        }),
      ]);
    });
  });
});
