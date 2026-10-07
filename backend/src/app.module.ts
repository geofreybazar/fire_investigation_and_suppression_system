import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { ConfigModule } from '@nestjs/config';

import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './modules/auth/constans.js';
import { OfficeModule } from './modules/office/office.module.js';
import configuration from './config/configuration.js';
import { PrismaModule } from './prisma.module.js';
import { PositionModule } from './modules/position/position.module.js';
import { NotificationModule } from './modules/notification/notification.module.js';
import { FireIncidentCategoriesModule } from './modules/fire-incident-categories/fire-incident-categories.module.js';
import { FireIncidentSubcategoriesModule } from './modules/fire-incident-subcategories/fire-incident-subcategories.module.js';
import { FireIncidentModule } from './modules/fire-incident/fire-incident.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '60s' },
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    OfficeModule,
    PositionModule,
    NotificationModule,
    FireIncidentCategoriesModule,
    FireIncidentSubcategoriesModule,
    FireIncidentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
