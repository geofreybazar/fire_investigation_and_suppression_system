import { Injectable, Logger } from '@nestjs/common';
import { FireIncidentSubCategoriesInput } from './schema/fire-incident-subcategories.schema.js';
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

  // findAll() {
  //   return `This action returns all fireIncidentSubcategories`;
  // }

  // findOne(id: number) {
  //   return `This action returns a #${id} fireIncidentSubcategory`;
  // }

  // update(id: number, updateFireIncidentSubcategoryDto: any) {
  //   return `This action updates a #${id} fireIncidentSubcategory`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} fireIncidentSubcategory`;
  // }
}
