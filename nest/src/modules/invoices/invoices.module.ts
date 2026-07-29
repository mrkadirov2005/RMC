import { Module } from '@nestjs/common';
import { InvoicesService } from './application/invoices.service';
import { INVOICES_REPOSITORY } from './domain/invoices.repository.port';
import { PostgresInvoicesRepository } from './infrastructure/postgres-invoices.repository';
import { InvoicesController } from './interfaces/invoices.controller';

@Module({
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    { provide: INVOICES_REPOSITORY, useClass: PostgresInvoicesRepository },
  ],
  exports: [InvoicesService],
})
export class InvoicesModule {}
