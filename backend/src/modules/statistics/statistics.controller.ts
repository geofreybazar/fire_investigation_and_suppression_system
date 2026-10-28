import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { type Response } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { RoleGuard } from '../../common/guards/role.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { type CurrentUserJwtPayload } from '../../types/jwt.payload.js';
import { INCIDENT_VIEWER_ROLES } from '../fire-incident/utils/incident-scope.js';
import { StatisticsService } from './statistics.service.js';
import {
  reportQuerySchema,
  statisticsQuerySchema,
  type ReportQuery,
  type StatisticsQuery,
} from './schema/statistics.schema.js';

// Everyone who may view incidents; NHQ_ADMIN and REGIONAL_ADMIN get 403.
@Roles(...INCIDENT_VIEWER_ROLES)
@UseGuards(AuthGuard, RoleGuard)
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('summary')
  async summary(
    @Query({ schema: statisticsQuerySchema }) query: StatisticsQuery,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.statisticsService.summary(query, user);
  }

  @Get('incidents')
  async reportPage(
    @Query({ schema: reportQuerySchema }) query: ReportQuery,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.statisticsService.reportPage(query, user);
  }

  @Get('incidents.csv')
  async reportCsv(
    @Query({ schema: statisticsQuerySchema }) query: StatisticsQuery,
    @CurrentUser() user: CurrentUserJwtPayload,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { csv, truncated } = await this.statisticsService.reportCsv(
      query,
      user,
    );

    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="fire-incidents.csv"',
    );
    response.setHeader('X-Report-Truncated', String(truncated));

    return csv;
  }

  @Get('map')
  async mapPoints(
    @Query({ schema: statisticsQuerySchema }) query: StatisticsQuery,
    @CurrentUser() user: CurrentUserJwtPayload,
  ) {
    return this.statisticsService.mapPoints(query, user);
  }
}
