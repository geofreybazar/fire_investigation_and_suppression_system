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
  Req,
} from '@nestjs/common';

import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { Permission } from '../../common/authz/permissions.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { PermissionGuard } from '../../common/guards/permission.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

import { OfficeService } from './office.service.js';
import { officeSchema, type OfficeInput } from './schema/office.schema.js';
import { OfficeType } from '../../generated/prisma/enums.js';

import { type UUID } from 'crypto';
import { type CurrentUserJwtPayload } from '../../types/jwt.payload.js';

// Writes need OFFICE_MANAGE. Lists are also open to user managers, who pick
// offices when creating accounts; both are limited to their jurisdiction.
@RequirePermission(Permission.OFFICE_MANAGE)
@UseGuards(AuthGuard, PermissionGuard)
@Controller('office_api')
export class OfficeController {
  constructor(private readonly officeService: OfficeService) {}

  @Post()
  async createOffice(
    @Body({ schema: officeSchema }) officeData: OfficeInput,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return await this.officeService.createOffice(officeData, user);
  }

  @RequirePermission(Permission.OFFICE_MANAGE, Permission.USER_MANAGE)
  @Get()
  async findPaginatedOffices(
    @CurrentUser() user: CurrentUserJwtPayload,
    @Query('page') page: number,
    @Query('search') search?: string,
    @Query('officetype') officetype?: string,
  ) {
    const searchQuery = search || '';
    const officeType = officetype || '';

    return await this.officeService.findPaginatedOffices(
      user,
      Number(page),
      searchQuery,
      officeType as OfficeType,
    );
  }

  @RequirePermission(Permission.OFFICE_MANAGE, Permission.USER_MANAGE)
  @Get('/alloffices')
  async getAllOffices(@CurrentUser() user: CurrentUserJwtPayload) {
    return await this.officeService.getAllOffices(user);
  }

  @Patch(':id')
  async updateOffice(
    @Param('id', new ParseUUIDPipe()) id: UUID,
    @Body({ schema: officeSchema }) officeData: OfficeInput,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return await this.officeService.updateOffice(id, officeData, user);
  }

  @Delete(':id')
  async deleteOffice(
    @Param('id', new ParseUUIDPipe()) id: UUID,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return await this.officeService.deleteOffice(id, user);
  }
}
