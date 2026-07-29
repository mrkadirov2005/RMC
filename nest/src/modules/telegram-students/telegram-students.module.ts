import { Module } from '@nestjs/common';
import { TelegramStudentsService } from './application/telegram-students.service';
import { TELEGRAM_STUDENTS_REPOSITORY } from './domain/telegram-students.repository.port';
import { PostgresTelegramStudentsRepository } from './infrastructure/postgres-telegram-students.repository';
import { TelegramStudentsController } from './interfaces/telegram-students.controller';

@Module({
  controllers: [TelegramStudentsController],
  providers: [
    TelegramStudentsService,
    { provide: TELEGRAM_STUDENTS_REPOSITORY, useClass: PostgresTelegramStudentsRepository },
  ],
  exports: [TelegramStudentsService],
})
export class TelegramStudentsModule {}
