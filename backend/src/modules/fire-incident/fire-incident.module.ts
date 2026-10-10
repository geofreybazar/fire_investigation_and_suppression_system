import { Module } from '@nestjs/common';
import { FireIncidentService } from './fire-incident.service.js';
import { FireIncidentController } from './fire-incident.controller.js';
import { FireIncidentRepository } from './fire-incident.repository.js';

@Module({
  controllers: [FireIncidentController],
  providers: [FireIncidentService, FireIncidentRepository],
})
export class FireIncidentModule {}
