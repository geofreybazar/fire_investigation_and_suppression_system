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
import { FireIncidentService } from './fire-incident.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RoleGuard } from '../../common/guards/role.guard.js';

// Only station operation staff and COMMEL may record incidents (FR-INC-001).
// Guards are class-level so any route added here is protected by default.
@Roles('CITY_MUNICIPALITY_OPERATION_STAFF', 'CITY_MUNICIPALITY_COMMEL')
@UseGuards(AuthGuard, RoleGuard)
@Controller('fire-incident')
export class FireIncidentController {
  constructor(private readonly fireIncidentService: FireIncidentService) {}

  @Post()
  addFireIncident(@Body() createFireIncidentDto: any) {
    return this.fireIncidentService.addFireIncident(createFireIncidentDto);
  }

  // @Get()
  // findAll() {
  //   return this.fireIncidentService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.fireIncidentService.findOne(+id);
  // }

  // @Patch(':id')
  // update(
  //   @Param('id') id: string,
  //   @Body() updateFireIncidentDto: UpdateFireIncidentDto,
  // ) {
  //   return this.fireIncidentService.update(+id, updateFireIncidentDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.fireIncidentService.remove(+id);
  // }
}
