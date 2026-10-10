import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InvestigationService } from './investigation.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RoleGuard } from '../../common/guards/role.guard.js';
import { ROLE } from '../../generated/prisma/enums.js';
import { type CurrentUserJwtPayload } from '../../types/jwt.payload.js';
import {
  investigationPageSchema,
  referCaseSchema,
  reviewReportSchema,
  startInvestigationSchema,
  updateInvestigationSchema,
  type InvestigationPageQuery,
  type ReferCaseInput,
  type ReviewReportInput,
  type StartInvestigationInput,
  type UpdateInvestigationInput,
} from './schema/investigation.schema.js';
import {
  CHIEF_INVESTIGATOR_ROLES,
  INVESTIGATOR_ROLES,
} from './utils/investigation-rules.js';
import { INCIDENT_VIEWER_ROLES } from '../fire-incident/utils/incident-scope.js';

const CHIEFS = [...CHIEF_INVESTIGATOR_ROLES, ROLE.SUPER_ADMIN];
const INVESTIGATORS = [...INVESTIGATOR_ROLES, ROLE.SUPER_ADMIN];

// Every route sets its own roles; the class-level list (incident viewers) is
// the default so a new route is never left open.
@Roles(...INCIDENT_VIEWER_ROLES)
@UseGuards(AuthGuard, RoleGuard)
@Controller('investigation')
export class InvestigationController {
  constructor(private readonly investigationService: InvestigationService) {}

  @Roles(...CHIEFS)
  @Get('queue')
  async findQueue(
    @Query({ schema: investigationPageSchema }) query: InvestigationPageQuery,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.investigationService.findQueue(query.page, user);
  }

  @Roles(...INVESTIGATORS)
  @Get('assigned')
  async findAssigned(
    @Query({ schema: investigationPageSchema }) query: InvestigationPageQuery,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.investigationService.findAssigned(query.page, user);
  }

  @Roles(...INCIDENT_VIEWER_ROLES)
  @Get('incident/:incidentId')
  async getCase(
    @Param('incidentId', new ParseUUIDPipe()) incidentId: string,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.investigationService.getCase(incidentId, user);
  }

  @Roles(...CHIEFS)
  @Get('incident/:incidentId/candidates')
  async findCandidates(
    @Param('incidentId', new ParseUUIDPipe()) incidentId: string,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.investigationService.findCandidates(incidentId, user);
  }

  @Roles(...CHIEFS)
  @Post('incident/:incidentId/refer')
  async refer(
    @Param('incidentId', new ParseUUIDPipe()) incidentId: string,
    @Body({ schema: referCaseSchema }) input: ReferCaseInput,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.investigationService.refer(incidentId, input, user);
  }

  @Roles(...CHIEFS)
  @Post('incident/:incidentId/start')
  async start(
    @Param('incidentId', new ParseUUIDPipe()) incidentId: string,
    @Body({ schema: startInvestigationSchema }) input: StartInvestigationInput,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.investigationService.start(incidentId, input, user);
  }

  @Roles(...INCIDENT_VIEWER_ROLES)
  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.investigationService.findOne(id, user);
  }

  @Roles(...INVESTIGATORS)
  @Patch(':id')
  async updateDraft(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body({ schema: updateInvestigationSchema })
    input: UpdateInvestigationInput,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.investigationService.updateDraft(id, input, user);
  }

  @Roles(...INVESTIGATORS)
  @Post(':id/submit')
  async submit(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.investigationService.submit(id, user);
  }

  @Roles(...CHIEFS)
  @Post(':id/review')
  async review(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body({ schema: reviewReportSchema }) input: ReviewReportInput,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.investigationService.review(id, input, user);
  }
}
