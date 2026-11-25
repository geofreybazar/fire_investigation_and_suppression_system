import { Module } from '@nestjs/common';
import { OfficeService } from './office.service.js';
import { OfficeController } from './office.controller.js';
import { OfficeAuthorizationService } from './services/office.authorization.service.js';
import { OfficeRepository } from './office.repository.js';

@Module({
  controllers: [OfficeController],
  providers: [OfficeService, OfficeAuthorizationService, OfficeRepository],
})
export class OfficeModule {}
