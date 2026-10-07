import { Test, TestingModule } from '@nestjs/testing';
import { FireIncidentCategoriesService } from './fire-incident-categories.service.js';

describe('FireIncidentCategoriesService', () => {
  let service: FireIncidentCategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FireIncidentCategoriesService],
    }).compile();

    service = module.get<FireIncidentCategoriesService>(FireIncidentCategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
