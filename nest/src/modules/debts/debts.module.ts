import { Module } from '@nestjs/common';
import { DebtsService } from './application/debts.service';
import { DEBTS_REPOSITORY } from './domain/debts.repository.port';
import { PostgresDebtsRepository } from './infrastructure/postgres-debts.repository';
import { DebtsController } from './interfaces/debts.controller';

@Module({
  controllers: [DebtsController],
  providers: [
    DebtsService,
    { provide: DEBTS_REPOSITORY, useClass: PostgresDebtsRepository },
  ],
  exports: [DebtsService],
})
export class DebtsModule {}
