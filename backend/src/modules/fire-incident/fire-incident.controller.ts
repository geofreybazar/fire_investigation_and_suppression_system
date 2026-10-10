import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FireIncidentService } from './fire-incident.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RoleGuard } from '../../common/guards/role.guard.js';
import { ROLE } from '../../generated/prisma/enums.js';
import { type CurrentUserJwtPayload } from '../../types/jwt.payload.js';
import {
  correctTimelineEntrySchema,
  createFireIncidentSchema,
  deleteFireIncidentSchema,
  listFireIncidentsQuerySchema,
  pageQuerySchema,
  rejectFireIncidentSchema,
  timelineEntrySchema,
  updateFireIncidentSchema,
  voidTimelineEntrySchema,
  type CorrectTimelineEntryInput,
  type CreateFireIncidentInput,
  type DeleteFireIncidentInput,
  type ListFireIncidentsQuery,
  type PageQuery,
  type RejectFireIncidentInput,
  type TimelineEntryInput,
  type UpdateFireIncidentInput,
  type VoidTimelineEntryInput,
} from './schema/fire-incident.schema.js';
import { INCIDENT_VIEWER_ROLES } from './utils/incident-scope.js';

// Routes without their own @Roles default to the incident editors: station
// operation staff and COMMEL (FR-INC-001). Guards are class-level so any
// route added here is protected by default.
@Roles(ROLE.CITY_MUNICIPALITY_OPERATION_STAFF, ROLE.CITY_MUNICIPALITY_COMMEL)
@UseGuards(AuthGuard, RoleGuard)
@Controller('fire-incident')
export class FireIncidentController {
  constructor(private readonly fireIncidentService: FireIncidentService) {}

  @Post()
  async submit(
    @Body({ schema: createFireIncidentSchema }) input: CreateFireIncidentInput,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.fireIncidentService.submit(input, user);
  }

  @Roles(...INCIDENT_VIEWER_ROLES)
  @Get()
  async findPaginated(
    @Query({ schema: listFireIncidentsQuerySchema })
    query: ListFireIncidentsQuery,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.fireIncidentService.findPaginated(query, user);
  }

  // Declared before ':id' so "deleted" isn't treated as an incident id.
  @Roles(ROLE.SUPER_ADMIN)
  @Get('deleted')
  async findDeleted(@Query({ schema: pageQuerySchema }) query: PageQuery) {
    return this.fireIncidentService.findDeleted(query.page);
  }

  @Roles(...INCIDENT_VIEWER_ROLES)
  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.fireIncidentService.findOne(id, user);
  }

  @Patch(':id')
  async updateDetails(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body({ schema: updateFireIncidentSchema }) input: UpdateFireIncidentInput,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.fireIncidentService.updateDetails(id, input, user);
  }

  @Post(':id/resubmit')
  async resubmit(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.fireIncidentService.resubmit(id, user);
  }

  @Roles(ROLE.CITY_MUNICIPALITY_OPERATION)
  @Post(':id/approve')
  async approve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.fireIncidentService.approve(id, user);
  }

  @Roles(ROLE.CITY_MUNICIPALITY_OPERATION)
  @Post(':id/reject')
  async reject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body({ schema: rejectFireIncidentSchema }) input: RejectFireIncidentInput,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.fireIncidentService.reject(id, input, user);
  }

  @Post(':id/timeline')
  async addTimelineEntry(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body({ schema: timelineEntrySchema }) input: TimelineEntryInput,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.fireIncidentService.addTimelineEntry(id, input, user);
  }

  @Post(':id/timeline/:entryId/void')
  async voidTimelineEntry(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('entryId', new ParseUUIDPipe()) entryId: string,
    @Body({ schema: voidTimelineEntrySchema }) input: VoidTimelineEntryInput,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.fireIncidentService.voidTimelineEntry(id, entryId, input, user);
  }

  @Post(':id/timeline/:entryId/correct')
  async correctTimelineEntry(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('entryId', new ParseUUIDPipe()) entryId: string,
    @Body({ schema: correctTimelineEntrySchema })
    input: CorrectTimelineEntryInput,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.fireIncidentService.correctTimelineEntry(
      id,
      entryId,
      input,
      user,
    );
  }

  // Staff remove their own rejected incidents; SUPER_ADMIN deletes approved ones.
  @Roles(
    ROLE.CITY_MUNICIPALITY_OPERATION_STAFF,
    ROLE.CITY_MUNICIPALITY_COMMEL,
    ROLE.SUPER_ADMIN,
  )
  @Delete(':id')
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body({ schema: deleteFireIncidentSchema }) input: DeleteFireIncidentInput,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.fireIncidentService.remove(id, input, user);
  }

  @Roles(ROLE.SUPER_ADMIN)
  @Post(':id/restore')
  async restore(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.fireIncidentService.restore(id, user);
  }
}
