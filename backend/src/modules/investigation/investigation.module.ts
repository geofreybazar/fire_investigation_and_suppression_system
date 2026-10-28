import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module.js';
import { InvestigationController } from './investigation.controller.js';
import { InvestigationService } from './investigation.service.js';
import { InvestigationRepository } from './investigation.repository.js';

@Module({
  imports: [NotificationModule],
  controllers: [InvestigationController],
  providers: [InvestigationService, InvestigationRepository],
})
export class InvestigationModule {}
