import { Test, TestingModule } from '@nestjs/testing';
import { FireIncidentController } from './fire-incident.controller.js';
import { FireIncidentService } from './fire-incident.service.js';

describe('FireIncidentController', () => {
  let controller: FireIncidentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FireIncidentController],
      providers: [FireIncidentService],
    }).compile();

    controller = module.get<FireIncidentController>(FireIncidentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
