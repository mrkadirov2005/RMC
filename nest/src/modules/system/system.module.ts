import { Module } from '@nestjs/common';
import { SystemService } from './application/system.service';
import { SYSTEM_REPOSITORY } from './domain/system.repository.port';
import { PostgresSystemRepository } from './infrastructure/postgres-system.repository';
import { SystemController } from './interfaces/system.controller';

@Module({
  controllers: [SystemController],
  providers: [
    SystemService,
    { provide: SYSTEM_REPOSITORY, useClass: PostgresSystemRepository },
  ],
  exports: [SystemService],
})
export class SystemModule {}
