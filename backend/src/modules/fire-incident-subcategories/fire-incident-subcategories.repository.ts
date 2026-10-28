import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';
import {
  type EditFireIncidentSubCategoryInput,
  FireIncidentSubCategoriesInput,
} from './schema/fire-incident-subcategories.schema.js';

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

  async getSubcategoryById(id: string) {
    return this.prismaService.fireIncidentSubcategory.findUnique({
      where: { id },
      include: {
        _count: { select: { incidents: true } },
      },
    });
  }

  async editFireIncidentSubcategory(
    id: string,
    input: EditFireIncidentSubCategoryInput,
  ) {
    return this.prismaService.fireIncidentSubcategory.update({
      where: { id },
      data: { name: input.name },
    });
  }

  async deleteById(id: string) {
    return this.prismaService.fireIncidentSubcategory.delete({
      where: { id },
    });
  }
}
