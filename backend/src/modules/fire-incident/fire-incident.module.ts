import { Module } from '@nestjs/common';
import { FireIncidentService } from './fire-incident.service.js';
import { FireIncidentController } from './fire-incident.controller.js';

@Module({
  controllers: [FireIncidentController],
  providers: [FireIncidentService],
})
export class FireIncidentModule {}
