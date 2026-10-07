import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FireIncidentCategoriesInput } from './schema/fire-incident-categories.schema.js';
import { FireIncidentCategoriesRepository } from './fire-incident-categories.repository.js';

@Injectable()
export class FireIncidentCategoriesService {
  constructor(
    private readonly fireIncidentCategoriesRepository: FireIncidentCategoriesRepository,
  ) {}
  private readonly logger = new Logger();

  async addFireIncidentCategory(
    fireIncidentCategoryInput: FireIncidentCategoriesInput,
  ) {
    this.logger.log('Adding new fire incident category');
    return this.fireIncidentCategoriesRepository.addFireIncidentCategory(
      fireIncidentCategoryInput,
    );
  }

  async getPaginatedCategories(page: number, searchQuery: string) {
    const limit = 10;
    const skip = (page - 1) * limit;

    const { fireIncidentCategories, totalCount } =
      await this.fireIncidentCategoriesRepository.getPaginatedCategories(
        searchQuery,
        limit,
        skip,
      );

    return {
      data: fireIncidentCategories,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async editFireIncidentCategory(
    id: string,
    fireIncidentCategoryInput: FireIncidentCategoriesInput,
  ) {
    this.logger.log(`Editing fire incident category with ID: ${id}`);

    const fireIncidentCategory =
      await this.fireIncidentCategoriesRepository.editFireIncidentCategory(
        id,
        fireIncidentCategoryInput,
      );

    return fireIncidentCategory;
  }

  async getCategoryById(id: string) {
    this.logger.log(`Fetching fire incident category with ID: ${id}`);

    const fireIncidentCategory =
      await this.fireIncidentCategoriesRepository.getCategoryById(id);

    return fireIncidentCategory;
  }

  async deleteCategory(id: string) {
    const category =
      await this.fireIncidentCategoriesRepository.getCategoryById(id);

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    if (category.subCategories.length > 0) {
      throw new ConflictException(
        'This category cannot be deleted because it has sub categories.',
      );
    }

    await this.fireIncidentCategoriesRepository.deleteById(id);

    return {
      message: 'Category deleted successfully.',
    };
  }
}
