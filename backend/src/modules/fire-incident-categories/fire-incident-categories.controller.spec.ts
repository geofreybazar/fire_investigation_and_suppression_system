import { Test, TestingModule } from '@nestjs/testing';
import { FireIncidentCategoriesController } from './fire-incident-categories.controller.js';
import { FireIncidentCategoriesService } from './fire-incident-categories.service.js';

describe('FireIncidentCategoriesController', () => {
  let controller: FireIncidentCategoriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FireIncidentCategoriesController],
      providers: [FireIncidentCategoriesService],
    }).compile();

    controller = module.get<FireIncidentCategoriesController>(FireIncidentCategoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
