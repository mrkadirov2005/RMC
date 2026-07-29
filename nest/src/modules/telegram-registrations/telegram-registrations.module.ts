import { Module } from '@nestjs/common';
import { TelegramRegistrationsService } from './application/telegram-registrations.service';
import { TELEGRAM_REGISTRATIONS_REPOSITORY } from './domain/telegram-registrations.repository.port';
import { PostgresTelegramRegistrationsRepository } from './infrastructure/postgres-telegram-registrations.repository';
import { TelegramRegistrationsController } from './interfaces/telegram-registrations.controller';

@Module({
  controllers: [TelegramRegistrationsController],
  providers: [
    TelegramRegistrationsService,
    { provide: TELEGRAM_REGISTRATIONS_REPOSITORY, useClass: PostgresTelegramRegistrationsRepository },
  ],
  exports: [TelegramRegistrationsService],
})
export class TelegramRegistrationsModule {}
