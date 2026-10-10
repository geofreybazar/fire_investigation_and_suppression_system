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

// A minimal ExecutionContext for the controller's create handler.
const contextFor = (request: object): ExecutionContext =>
  ({
    // Looked up by name: only the function's identity matters to the Reflector.
    getHandler: () =>
      Reflect.get(FireIncidentController.prototype, 'addFireIncident'),
    getClass: () => FireIncidentController,
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('FireIncidentController', () => {
  let controller: FireIncidentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FireIncidentController],
      providers: [FireIncidentService],
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

  describe('RoleGuard on the create route', () => {
    const roleGuard = new RoleGuard(new Reflector());

    it.each(['CITY_MUNICIPALITY_OPERATION_STAFF', 'CITY_MUNICIPALITY_COMMEL'])(
      'allows %s',
      async (role) => {
        await expect(
          roleGuard.canActivate(contextFor({ user: { role } })),
        ).resolves.toBe(true);
      },
    );

    it.each(['NHQ_ADMIN', 'SUPER_ADMIN', 'CITY_MUNICIPALITY_OPERATION'])(
      'rejects %s',
      async (role) => {
        await expect(
          roleGuard.canActivate(contextFor({ user: { role } })),
        ).rejects.toThrow(ForbiddenException);
      },
    );
  });

  it('AuthGuard rejects a request without an access token', async () => {
    const authGuard = new AuthGuard(
      {} as JwtService,
      { get: () => 'secret' } as unknown as ConfigService,
    );

    await expect(
      authGuard.canActivate(contextFor({ cookies: {} })),
    ).rejects.toMatchObject({
      response: { error: 'TOKEN_EXPIRED' },
    });
  });
});
