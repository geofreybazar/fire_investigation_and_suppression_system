import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FireIncidentService } from './fire-incident.service.js';
import { CreateFireIncidentDto } from './dto/create-fire-incident.dto.js';
import { UpdateFireIncidentDto } from './dto/update-fire-incident.dto.js';

@Controller('fire-incident')
export class FireIncidentController {
  constructor(private readonly fireIncidentService: FireIncidentService) {}

  @Post()
  create(@Body() createFireIncidentDto: CreateFireIncidentDto) {
    return this.fireIncidentService.create(createFireIncidentDto);
  }

  @Get()
  findAll() {
    return this.fireIncidentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fireIncidentService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFireIncidentDto: UpdateFireIncidentDto) {
    return this.fireIncidentService.update(+id, updateFireIncidentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fireIncidentService.remove(+id);
  }
}
