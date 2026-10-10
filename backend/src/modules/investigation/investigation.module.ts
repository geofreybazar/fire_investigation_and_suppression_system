import { Module } from '@nestjs/common';
import { InvestigationController } from './investigation.controller.js';
import { InvestigationService } from './investigation.service.js';
import { InvestigationRepository } from './investigation.repository.js';

@Module({
  controllers: [InvestigationController],
  providers: [InvestigationService, InvestigationRepository],
})
export class InvestigationModule {}
