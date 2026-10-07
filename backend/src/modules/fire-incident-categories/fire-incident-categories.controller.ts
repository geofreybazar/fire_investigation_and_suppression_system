import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FireIncidentCategoriesService } from './fire-incident-categories.service.js';
import {
  fireIncidentCategoriesSchema,
  type FireIncidentCategoriesInput,
} from './schema/fire-incident-categories.schema.js';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RoleGuard } from '../../common/guards/role.guard.js';

@Controller('fire_incident_categories_api')
export class FireIncidentCategoriesController {
  constructor(
    private readonly fireIncidentCategoriesService: FireIncidentCategoriesService,
  ) {}

  @Roles(
    'SUPER_ADMIN',
    'NHQ_ADMIN',
    'NHQ_CHIEF_INVESTIGATOR',
    'NHQ_INVESTIGATOR',
  )
  @UseGuards(AuthGuard, RoleGuard)
  @Post()
  async addFireIncidentCategory(
    @Body({ schema: fireIncidentCategoriesSchema })
    fireIncidentCategoryInput: FireIncidentCategoriesInput,
  ) {
    return this.fireIncidentCategoriesService.addFireIncidentCategory(
      fireIncidentCategoryInput,
    );
  }

  @Roles(
    'SUPER_ADMIN',
    'NHQ_ADMIN',
    'NHQ_CHIEF_INVESTIGATOR',
    'NHQ_INVESTIGATOR',
  )
  @UseGuards(AuthGuard, RoleGuard)
  @Get()
  async getPaginatedCategories(
    @Query('page') page: number,
    @Query('search') search?: string,
  ) {
    const searchQuery = search || '';

    return this.fireIncidentCategoriesService.getPaginatedCategories(
      page,
      searchQuery,
    );
  }

  @Roles(
    'SUPER_ADMIN',
    'NHQ_ADMIN',
    'NHQ_CHIEF_INVESTIGATOR',
    'NHQ_INVESTIGATOR',
  )
  @UseGuards(AuthGuard, RoleGuard)
  @Patch(':id')
  async editFireIncidentCategory(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() fireIncidentCategoryInput: FireIncidentCategoriesInput,
  ) {
    return this.fireIncidentCategoriesService.editFireIncidentCategory(
      id,
      fireIncidentCategoryInput,
    );
  }

  @Roles(
    'SUPER_ADMIN',
    'NHQ_ADMIN',
    'NHQ_CHIEF_INVESTIGATOR',
    'NHQ_INVESTIGATOR',
  )
  @UseGuards(AuthGuard, RoleGuard)
  @Get(':id')
  async getCategoryById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.fireIncidentCategoriesService.getCategoryById(id);
  }

  @Roles(
    'SUPER_ADMIN',
    'NHQ_ADMIN',
    'NHQ_CHIEF_INVESTIGATOR',
    'NHQ_INVESTIGATOR',
  )
  @UseGuards(AuthGuard, RoleGuard)
  @Delete(':id')
  async deleteCategory(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.fireIncidentCategoriesService.deleteCategory(id);
  }
}
