import { Test, TestingModule } from '@nestjs/testing';
import { FireIncidentService } from './fire-incident.service.js';

describe('FireIncidentService', () => {
  let service: FireIncidentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FireIncidentService],
    }).compile();

    service = module.get<FireIncidentService>(FireIncidentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
