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
import { PositionService } from './position.service.js';
import {
  positionSchema,
  type PositionInput,
} from './schema/position.schema.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { PermissionGuard } from '../../common/guards/permission.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { Permission } from '../../common/authz/permissions.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { type CurrentUserJwtPayload } from '../../types/jwt.payload.js';
import { type UUID } from 'crypto';

// Writes need POSITION_MANAGE; user managers also read the list.
@RequirePermission(Permission.POSITION_MANAGE)
@UseGuards(AuthGuard, PermissionGuard)
@Controller('position_api')
export class PositionController {
  constructor(private readonly positionService: PositionService) {}

  @Post()
  async create(
    @Body({ schema: positionSchema }) positionData: PositionInput,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return await this.positionService.create(positionData, user.sub);
  }

  @RequirePermission(Permission.POSITION_MANAGE, Permission.USER_MANAGE)
  @Get()
  async findPaginatedPositions(
    @Query('page') page: number,
    @Query('search') search?: string,
  ) {
    return await this.positionService.findPaginatedPositions(page, search);
  }

  @RequirePermission(Permission.POSITION_MANAGE, Permission.USER_MANAGE)
  @Get('/allpositions')
  async findAllPositions() {
    return await this.positionService.findAllPositions();
  }

  @Patch(':id')
  async updatePositon(
    @Body({ schema: positionSchema }) positionData: PositionInput,
    @Param('id', new ParseUUIDPipe()) id: UUID,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return await this.positionService.updatePositon(id, positionData, user.sub);
  }

  @Delete(':id')
  async deletePosiiton(
    @Param('id', new ParseUUIDPipe()) positionid: UUID,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return await this.positionService.deletePosiiton(positionid, user.sub);
  }
}
