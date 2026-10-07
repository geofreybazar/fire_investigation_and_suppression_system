import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';
import { FireIncidentSubCategoriesInput } from './schema/fire-incident-subcategories.schema.js';

@Injectable()
export class FireIncidentSubCategoriesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async addFireIncidentSubcategory(
    fireIncidentSubCategoryInput: FireIncidentSubCategoriesInput,
  ) {
    return this.prismaService.fireIncidentSubcategory.create({
      data: fireIncidentSubCategoryInput,
    });
  }
}
