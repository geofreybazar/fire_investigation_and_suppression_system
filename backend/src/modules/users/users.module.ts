import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';
import { OfficeRepository } from '../office/office.repository.js';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, OfficeRepository],
})
export class UsersModule {}
