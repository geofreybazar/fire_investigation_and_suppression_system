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
import {
  FireIncidentStatus,
  IncidentApprovalStatus,
  ROLE,
} from './../src/generated/prisma/enums.js';

// Runs against the database in .env. Every record it creates carries a unique
// suffix and is deleted in afterAll, so existing data is never touched.

const suffix = randomUUID().slice(0, 6).toUpperCase();
const password = 'E2e-Password-123!';

describe('Statistics (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const officeIds: string[] = [];
  const userIds: string[] = [];
  const stationIds: string[] = [];
  let positionId: string;
  let categoryId: string;
  let creatorId: string;

  const cookies: Record<string, string> = {};
  const server = () => app.getHttpServer();

  async function office(data: {
    name: string;
    type:
      | 'NATIONAL_HEADQUARTERS'
      | 'REGIONAL_OFFICE'
      | 'DISTRICT_FIRE_STATION'
      | 'CITY_FIRE_STATION';
    parentId?: string;
    regionId?: string;
  }) {
    const created = await prisma.office.create({ data });
    officeIds.unshift(created.id); // children are deleted before parents
    return created.id;
  }

  async function account(tag: string, role: ROLE, officeId: string) {
    const accountNumber = `E4${tag}${suffix}`.slice(0, 10);
    const user = await prisma.user.create({
      data: {
        email: `e2e-${tag.toLowerCase()}-${suffix.toLowerCase()}@example.test`,
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

  async function incident(
    stationId: string,
    options: {
      status: FireIncidentStatus;
      approval: IncidentApprovalStatus;
      date: string;
      coordinates?: boolean;
      fatalities?: number;
    },
  ) {
    await prisma.fireIncident.create({
      data: {
        incidentNo:
          options.approval === 'APPROVED'
            ? `E2E-${suffix}-${randomUUID().slice(0, 6)}`
            : null,
        fireIncidentStatus: options.status,
        approvalStatus: options.approval,
        dateTimeFireIncident: new Date(options.date),
        categoryId,
        officeId: stationId,
        createdById: creatorId,
        location: {
          create: {
            placeOfOccurence: '12 Rizal St., Corner "A"',
            barangay: 'San Isidro',
            region: 'Region',
            province_district: 'District',
            city_municipality: 'City',
            ...(options.coordinates && {
              latitude: 14.676,
              longitude: 121.0437,
            }),
          },
        },
        ...(options.fatalities !== undefined && {
          impact: { create: { fatalitiesCiv: options.fatalities } },
        }),
      },
    });
  }

  const summaryAs = async (tag: string, query: Record<string, string> = {}) =>
    (
      await request(server())
        .get('/api/statistics/summary')
        .query(query)
        .set('Cookie', cookies[tag])
        .expect(200)
    ).body;

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
        data: { name: `E2E Stats Position ${suffix}` },
      })
    ).id;
    categoryId = (
      await prisma.fireIncidentCategory.create({
        data: { name: `E2E Stats Category ${suffix}`, type: 'STRUCTURAL' },
      })
    ).id;

    const nhq = await office({
      name: `E2E Stats NHQ ${suffix}`,
      type: 'NATIONAL_HEADQUARTERS',
    });
    const stationIn = async (tag: string) => {
      const region = await office({
        name: `E2E Stats Region ${tag} ${suffix}`,
        type: 'REGIONAL_OFFICE',
        parentId: nhq,
      });
      const district = await office({
        name: `E2E Stats District ${tag} ${suffix}`,
        type: 'DISTRICT_FIRE_STATION',
        parentId: region,
        regionId: region,
      });
      const station = await office({
        name: `E2E Stats Station ${tag} ${suffix}`,
        type: 'CITY_FIRE_STATION',
        parentId: district,
        regionId: region,
      });
      stationIds.push(station);
      return { region, station };
    };
    const a = await stationIn('A');
    const b = await stationIn('B');

    creatorId = await account(
      'ST',
      'CITY_MUNICIPALITY_OPERATION_STAFF',
      a.station,
    );
    await account('RA', 'REGIONAL_CHIEF_INVESTIGATOR', a.region);
    await account('SA', 'SUPER_ADMIN', nhq);
    await account('AD', 'REGIONAL_ADMIN', a.region);

    // Region A: two approved (one with coordinates), one pending.
    await incident(a.station, {
      status: 'FIRE_OUT',
      approval: 'APPROVED',
      date: '2026-03-15T02:00:00Z',
      coordinates: true,
      fatalities: 2,
    });
    await incident(a.station, {
      status: 'ON_GOING',
      approval: 'APPROVED',
      date: '2026-04-02T02:00:00Z',
    });
    await incident(a.station, {
      status: 'VERIFICATION',
      approval: 'PENDING',
      date: '2026-04-03T02:00:00Z',
    });
    // Region B: one approved.
    await incident(b.station, {
      status: 'FIRE_OUT',
      approval: 'APPROVED',
      date: '2026-03-20T02:00:00Z',
      fatalities: 1,
    });
  });

  afterAll(async () => {
    // The location restricts incident deletion (REQUIREMENTS.md D-05).
    await prisma.incidentLocation.deleteMany({
      where: { fireIncident: { officeId: { in: stationIds } } },
    });
    await prisma.fireIncident.deleteMany({
      where: { officeId: { in: stationIds } },
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

  // Other data in the database counts too for SUPER_ADMIN, so these tests
  // narrow to this run's category.
  const ours = { categoryType: 'STRUCTURAL' };

  it("counts only approved incidents in the viewer's region", async () => {
    const summary = await summaryAs('RA');

    expect(summary.totals).toMatchObject({ incidents: 2, active: 1 });
    expect(summary.impact.fatalitiesCiv).toBe(2);
    expect(
      summary.byMonth.map((bucket: { key: string }) => bucket.key),
    ).toEqual(['2026-03', '2026-04']);
  });

  it('applies the date filter', async () => {
    const summary = await summaryAs('RA', {
      from: '2026-04-01T00:00:00+08:00',
      to: '2026-04-30T23:59:59+08:00',
    });

    expect(summary.totals.incidents).toBe(1);
  });

  it('lets SUPER_ADMIN see every region, grouped by region', async () => {
    const summary = await summaryAs('SA', ours);
    const regions = summary.byOffice
      .map((bucket: { label: string }) => bucket.label)
      .filter((name: string) => name.includes(suffix));

    expect(regions.sort()).toEqual([
      `E2E Stats Region A ${suffix}`,
      `E2E Stats Region B ${suffix}`,
    ]);
  });

  it('exports the report as CSV', async () => {
    const response = await request(server())
      .get('/api/statistics/incidents.csv')
      .set('Cookie', cookies.RA)
      .expect(200);

    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['x-report-truncated']).toBe('false');
    const lines = response.text.split('\r\n').filter(Boolean);
    expect(lines[0]).toMatch(/^﻿Incident No\.,Incident date,Status/);
    expect(lines).toHaveLength(3); // header + two approved incidents
    expect(response.text).toContain('"12 Rizal St., Corner ""A"""');
  });

  it('returns map points only for incidents with coordinates', async () => {
    const response = await request(server())
      .get('/api/statistics/map')
      .set('Cookie', cookies.RA)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      latitude: 14.676,
      longitude: 121.0437,
      status: 'FIRE_OUT',
    });
  });

  it('forbids admins without incident access', async () => {
    await request(server())
      .get('/api/statistics/summary')
      .set('Cookie', cookies.AD)
      .expect(403);
  });

  it("rejects a 'from' after 'to'", async () => {
    await request(server())
      .get('/api/statistics/summary')
      .query({ from: '2026-05-01', to: '2026-04-01' })
      .set('Cookie', cookies.RA)
      .expect(400);
  });
});
