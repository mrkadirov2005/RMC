import { Module } from '@nestjs/common';
import { SessionsService } from './application/sessions.service';
import { SESSIONS_REPOSITORY } from './domain/sessions.repository.port';
import { PostgresSessionsRepository } from './infrastructure/postgres-sessions.repository';
import { SessionsController } from './interfaces/sessions.controller';

@Module({
  controllers: [SessionsController],
  providers: [
    SessionsService,
    { provide: SESSIONS_REPOSITORY, useClass: PostgresSessionsRepository },
  ],
  exports: [SessionsService],
})
export class SessionsModule {}
