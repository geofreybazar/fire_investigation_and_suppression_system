import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  type EditFireIncidentSubCategoryInput,
  FireIncidentSubCategoriesInput,
} from './schema/fire-incident-subcategories.schema.js';
import { FireIncidentSubCategoriesRepository } from './fire-incident-subcategories.repository.js';

@Injectable()
export class FireIncidentSubcategoriesService {
  constructor(
    private readonly fireIncidentSubCategoriesRepository: FireIncidentSubCategoriesRepository,
  ) {}

  private readonly logger = new Logger();

  async addFireIncidentSubcategory(
    fireIncidentSubCategoryInput: FireIncidentSubCategoriesInput,
  ) {
    this.logger.log('Adding new fire incident sub-category');
    return await this.fireIncidentSubCategoriesRepository.addFireIncidentSubcategory(
      fireIncidentSubCategoryInput,
    );
  }

  async getSubcategoryById(id: string) {
    const subcategory =
      await this.fireIncidentSubCategoriesRepository.getSubcategoryById(id);

    if (!subcategory) {
      throw new NotFoundException('Sub category not found.');
    }

    return subcategory;
  }

  async editFireIncidentSubcategory(
    id: string,
    input: EditFireIncidentSubCategoryInput,
  ) {
    await this.getSubcategoryById(id);

    this.logger.log(`Editing fire incident sub-category: ${id}`);
    return this.fireIncidentSubCategoriesRepository.editFireIncidentSubcategory(
      id,
      input,
    );
  }

  async deleteSubcategory(id: string) {
    const subcategory = await this.getSubcategoryById(id);

    // The foreign key would silently null the incidents' subcategory, so the
    // check has to happen here. The count includes soft-deleted incidents.
    if (subcategory._count.incidents > 0) {
      throw new ConflictException(
        'This sub category cannot be deleted because fire incidents use it.',
      );
    }

    await this.fireIncidentSubCategoriesRepository.deleteById(id);

    return {
      message: 'Sub category deleted successfully.',
    };
  }
}
