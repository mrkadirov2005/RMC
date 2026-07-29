import { Module } from '@nestjs/common';
import { NotificationsService } from './application/notifications.service';
import { NOTIFICATIONS_REPOSITORY } from './domain/notifications.repository.port';
import { PostgresNotificationsRepository } from './infrastructure/postgres-notifications.repository';
import { NotificationsController } from './interfaces/notifications.controller';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    { provide: NOTIFICATIONS_REPOSITORY, useClass: PostgresNotificationsRepository },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
