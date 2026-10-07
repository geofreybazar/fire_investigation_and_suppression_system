import { Test, TestingModule } from '@nestjs/testing';
import { FireIncidentSubcategoriesController } from './fire-incident-subcategories.controller.js';
import { FireIncidentSubcategoriesService } from './fire-incident-subcategories.service.js';

describe('FireIncidentSubcategoriesController', () => {
  let controller: FireIncidentSubcategoriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FireIncidentSubcategoriesController],
      providers: [FireIncidentSubcategoriesService],
    }).compile();

    controller = module.get<FireIncidentSubcategoriesController>(FireIncidentSubcategoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
