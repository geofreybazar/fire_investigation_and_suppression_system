import { Test, TestingModule } from '@nestjs/testing';
import { FireIncidentSubcategoriesService } from './fire-incident-subcategories.service.js';

describe('FireIncidentSubcategoriesService', () => {
  let service: FireIncidentSubcategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FireIncidentSubcategoriesService],
    }).compile();

    service = module.get<FireIncidentSubcategoriesService>(FireIncidentSubcategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
