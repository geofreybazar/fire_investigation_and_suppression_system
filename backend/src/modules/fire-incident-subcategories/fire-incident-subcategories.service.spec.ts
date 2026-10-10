import { Test, TestingModule } from '@nestjs/testing';
import { FireIncidentSubcategoriesService } from './fire-incident-subcategories.service.js';
import { FireIncidentSubCategoriesRepository } from './fire-incident-subcategories.repository.js';
import { type FireIncidentSubCategoriesInput } from './schema/fire-incident-subcategories.schema.js';

describe('FireIncidentSubcategoriesService', () => {
  let service: FireIncidentSubcategoriesService;
  let repository: { addFireIncidentSubcategory: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    repository = { addFireIncidentSubcategory: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FireIncidentSubcategoriesService,
        { provide: FireIncidentSubCategoriesRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<FireIncidentSubcategoriesService>(
      FireIncidentSubcategoriesService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addFireIncidentSubcategory', () => {
    it('creates and returns the sub category', async () => {
      const input = { name: 'Residential' } as FireIncidentSubCategoriesInput;
      const created = { id: 'sub-1', ...input };
      repository.addFireIncidentSubcategory.mockResolvedValue(created);

      await expect(service.addFireIncidentSubcategory(input)).resolves.toBe(
        created,
      );
      expect(repository.addFireIncidentSubcategory).toHaveBeenCalledWith(input);
    });
  });
});
