import { Test, TestingModule } from '@nestjs/testing';
import { FireIncidentSubcategoriesController } from './fire-incident-subcategories.controller.js';
import { FireIncidentSubcategoriesService } from './fire-incident-subcategories.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RoleGuard } from '../../common/guards/role.guard.js';

describe('FireIncidentSubcategoriesController', () => {
  let controller: FireIncidentSubcategoriesController;
  const service = {
    addFireIncidentSubcategory: vi.fn(),
    getSubcategoryById: vi.fn(),
    editFireIncidentSubcategory: vi.fn(),
    deleteSubcategory: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FireIncidentSubcategoriesController],
      providers: [
        { provide: FireIncidentSubcategoriesService, useValue: service },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FireIncidentSubcategoriesController>(
      FireIncidentSubcategoriesController,
    );
  });

  it('delegates edit and delete to the service', async () => {
    await controller.editFireIncidentSubcategory('sub-1', {
      name: 'Commercial',
    });
    await controller.deleteSubcategory('sub-1');

    expect(service.editFireIncidentSubcategory).toHaveBeenCalledWith('sub-1', {
      name: 'Commercial',
    });
    expect(service.deleteSubcategory).toHaveBeenCalledWith('sub-1');
  });
});
