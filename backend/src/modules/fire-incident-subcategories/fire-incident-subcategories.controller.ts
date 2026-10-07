import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { FireIncidentSubcategoriesService } from './fire-incident-subcategories.service.js';
import {
  type FireIncidentSubCategoriesInput,
  fireIncidentSubCategoriesSchema,
} from './schema/fire-incident-subcategories.schema.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RoleGuard } from '../../common/guards/role.guard.js';

@Controller('fire_incident_subcategories_api')
export class FireIncidentSubcategoriesController {
  constructor(
    private readonly fireIncidentSubcategoriesService: FireIncidentSubcategoriesService,
  ) {}

  @Roles(
    'SUPER_ADMIN',
    'NHQ_ADMIN',
    'NHQ_CHIEF_INVESTIGATOR',
    'NHQ_INVESTIGATOR',
  )
  @UseGuards(AuthGuard, RoleGuard)
  @Post()
  async addFireIncidentSubcategory(
    @Body({ schema: fireIncidentSubCategoriesSchema })
    fireIncidentSubCategoryInput: FireIncidentSubCategoriesInput,
  ) {
    return this.fireIncidentSubcategoriesService.addFireIncidentSubcategory(
      fireIncidentSubCategoryInput,
    );
  }

  // @Get()
  // findAll() {
  //   return this.fireIncidentSubcategoriesService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.fireIncidentSubcategoriesService.findOne(+id);
  // }

  // @Patch(':id')
  // update(
  //   @Param('id') id: string,
  //   @Body() updateFireIncidentSubcategoryDto: any,
  // ) {
  //   return this.fireIncidentSubcategoriesService.update(
  //     +id,
  //     updateFireIncidentSubcategoryDto,
  //   );
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.fireIncidentSubcategoriesService.remove(+id);
  // }
}
