import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants.js';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { FireIncidentController } from './fire-incident.controller.js';
import { FireIncidentService } from './fire-incident.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RoleGuard } from '../../common/guards/role.guard.js';

type Handler = keyof FireIncidentController;

// A minimal ExecutionContext for one of the controller's handlers.
const contextFor = (handler: Handler, request: object): ExecutionContext =>
  ({
    // Looked up by name: only the function's identity matters to the Reflector.
    getHandler: () => Reflect.get(FireIncidentController.prototype, handler),
    getClass: () => FireIncidentController,
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

const roleGuard = new RoleGuard(new Reflector());

const allows = (handler: Handler, role: string) =>
  roleGuard.canActivate(contextFor(handler, { user: { role } })).then(
    () => true,
    (error: unknown) => {
      if (error instanceof ForbiddenException) return false;
      throw error;
    },
  );

describe('FireIncidentController', () => {
  let controller: FireIncidentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FireIncidentController],
      providers: [{ provide: FireIncidentService, useValue: {} }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FireIncidentController>(FireIncidentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('requires authentication and role checks on every route', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, FireIncidentController),
    ).toEqual([AuthGuard, RoleGuard]);
    expect(Reflect.getMetadata('roles', FireIncidentController)).toEqual([
      'CITY_MUNICIPALITY_OPERATION_STAFF',
      'CITY_MUNICIPALITY_COMMEL',
    ]);
  });

  describe('role access per route', () => {
    it.each([
      // [handler, role, allowed]
      ['submit', 'CITY_MUNICIPALITY_OPERATION_STAFF', true],
      ['submit', 'CITY_MUNICIPALITY_COMMEL', true],
      ['submit', 'CITY_MUNICIPALITY_OPERATION', false],
      ['submit', 'SUPER_ADMIN', false],
      ['addTimelineEntry', 'CITY_MUNICIPALITY_COMMEL', true],
      ['addTimelineEntry', 'CITY_MUNICIPALITY_INVESTIGATOR', false],
      ['updateDetails', 'SUPER_ADMIN', false],
      ['findPaginated', 'NHQ_VIEWER', true],
      ['findPaginated', 'CITY_MUNICIPALITY_INVESTIGATOR', true],
      ['findPaginated', 'SUPER_ADMIN', true],
      ['findPaginated', 'NHQ_ADMIN', false],
      ['findOne', 'REGIONAL_ADMIN', false],
      ['approve', 'CITY_MUNICIPALITY_OPERATION', true],
      ['approve', 'CITY_MUNICIPALITY_OPERATION_STAFF', false],
      ['reject', 'CITY_MUNICIPALITY_OPERATION', true],
      ['remove', 'CITY_MUNICIPALITY_OPERATION_STAFF', true],
      ['remove', 'SUPER_ADMIN', true],
      ['remove', 'NHQ_ADMIN', false],
      ['findDeleted', 'SUPER_ADMIN', true],
      ['findDeleted', 'CITY_MUNICIPALITY_OPERATION_STAFF', false],
      ['restore', 'SUPER_ADMIN', true],
      ['restore', 'NHQ_ADMIN', false],
    ] as [Handler, string, boolean][])(
      '%s: %s allowed = %s',
      async (handler, role, allowed) => {
        await expect(allows(handler, role)).resolves.toBe(allowed);
      },
    );
  });

  it('AuthGuard rejects a request without an access token', async () => {
    const authGuard = new AuthGuard(
      {} as JwtService,
      { get: () => 'secret' } as unknown as ConfigService,
    );

    await expect(
      authGuard.canActivate(contextFor('submit', { cookies: {} })),
    ).rejects.toMatchObject({
      response: { error: 'TOKEN_EXPIRED' },
    });
  });
});
