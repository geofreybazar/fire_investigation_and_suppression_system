import { Test, TestingModule } from '@nestjs/testing';
import { OfficeService } from './office.service.js';

describe('OfficeService', () => {
  let service: OfficeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OfficeService],
    }).compile();

    service = module.get<OfficeService>(OfficeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
