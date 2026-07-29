import { Module } from '@nestjs/common';
import { RefundsService } from './application/refunds.service';
import { REFUNDS_REPOSITORY } from './domain/refunds.repository.port';
import { PostgresRefundsRepository } from './infrastructure/postgres-refunds.repository';
import { RefundsController } from './interfaces/refunds.controller';

@Module({
  controllers: [RefundsController],
  providers: [
    RefundsService,
    { provide: REFUNDS_REPOSITORY, useClass: PostgresRefundsRepository },
  ],
  exports: [RefundsService],
})
export class RefundsModule {}
