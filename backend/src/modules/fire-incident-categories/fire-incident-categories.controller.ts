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
import { ROLE } from '../../generated/prisma/enums.js';
import { INCIDENT_VIEWER_ROLES } from '../fire-incident/utils/incident-scope.js';

// Everyone who records or views incidents needs to read the classification
// list; NHQ_ADMIN keeps the read access it already had.
const CATEGORY_READER_ROLES = [...INCIDENT_VIEWER_ROLES, ROLE.NHQ_ADMIN];

@Roles(
  'SUPER_ADMIN',
  'NHQ_ADMIN',
  'NHQ_CHIEF_INVESTIGATOR',
  'NHQ_INVESTIGATOR',
  'NHQ_OPERATION',
  'NHQ_OPERATION_STAFF',
)
@UseGuards(AuthGuard, RoleGuard)
@Controller('fire_incident_categories_api')
export class FireIncidentCategoriesController {
  constructor(
    private readonly fireIncidentCategoriesService: FireIncidentCategoriesService,
  ) {}

  @Post()
  async addFireIncidentCategory(
    @Body({ schema: fireIncidentCategoriesSchema })
    fireIncidentCategoryInput: FireIncidentCategoriesInput,
  ) {
    return this.fireIncidentCategoriesService.addFireIncidentCategory(
      fireIncidentCategoryInput,
    );
  }

  @Roles(...CATEGORY_READER_ROLES)
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

  @Patch(':id')
  async editFireIncidentCategory(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body({ schema: fireIncidentCategoriesSchema })
    fireIncidentCategoryInput: FireIncidentCategoriesInput,
  ) {
    return this.fireIncidentCategoriesService.editFireIncidentCategory(
      id,
      fireIncidentCategoryInput,
    );
  }

  @Roles(...CATEGORY_READER_ROLES)
  @Get(':id')
  async getCategoryById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.fireIncidentCategoriesService.getCategoryById(id);
  }

  @Delete(':id')
  async deleteCategory(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.fireIncidentCategoriesService.deleteCategory(id);
  }
}
