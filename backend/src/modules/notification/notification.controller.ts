import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { NotificationService } from './notification.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { type UUID } from 'crypto';
import {
  notificationSchema,
  type NotificationInput,
} from './schema/notification.schema.js';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @UseGuards(AuthGuard)
  @Get(':id')
  async getUserNotificationSettings(
    @Param('id', new ParseUUIDPipe()) id: UUID,
  ) {
    return await this.notificationService.getUserNotificationSettings(id);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  async updateNotificationSettings(
    @Param('id', new ParseUUIDPipe()) id: UUID,
    @Body({ schema: notificationSchema })
    updateNotificationDto: NotificationInput,
  ) {
    return await this.notificationService.updateNotificationSettings(
      id,
      updateNotificationDto,
    );
  }

  // @Post()
  // create(@Body() createNotificationDto: CreateNotificationDto) {
  //   return this.notificationService.create(createNotificationDto);
  // }

  // @Get()
  // findAll() {
  //   return this.notificationService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.notificationService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateNotificationDto: UpdateNotificationDto) {
  //   return this.notificationService.update(+id, updateNotificationDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.notificationService.remove(+id);
  // }
}
