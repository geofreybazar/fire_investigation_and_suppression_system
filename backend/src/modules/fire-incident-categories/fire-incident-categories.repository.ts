import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';
import { FireIncidentCategoriesInput } from './schema/fire-incident-categories.schema.js';
import { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class FireIncidentCategoriesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async addFireIncidentCategory(
    fireIncidentCategoryInput: FireIncidentCategoriesInput,
  ) {
    return this.prismaService.fireIncidentCategory.create({
      data: fireIncidentCategoryInput,
    });
  }

  async getPaginatedCategories(
    searchQuery: string,
    limit: number,
    skip: number,
  ) {
    const where: Prisma.FireIncidentCategoryWhereInput = {
      name: {
        contains: searchQuery,
        mode: 'insensitive',
      },
    };

    const [fireIncidentCategories, totalCount] = await Promise.all([
      this.prismaService.fireIncidentCategory.findMany({
        where,
        include: {
          subCategories: true,
          incidents: true,
        },
        take: limit,
        skip: skip,
      }),
      this.prismaService.fireIncidentCategory.count({ where }),
    ]);

    return {
      fireIncidentCategories,
      totalCount,
    };
  }

  async editFireIncidentCategory(
    id: string,
    fireIncidentCategoryInput: FireIncidentCategoriesInput,
  ) {
    return this.prismaService.fireIncidentCategory.update({
      where: { id },
      data: { ...fireIncidentCategoryInput },
    });
  }

  async getCategoryById(id: string) {
    return this.prismaService.fireIncidentCategory.findUnique({
      where: { id },
      include: {
        subCategories: true,
        incidents: true,
      },
    });
  }

  async deleteById(id: string) {
    return this.prismaService.fireIncidentCategory.delete({
      where: { id },
    });
  }
}
