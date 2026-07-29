import { Module } from '@nestjs/common';
import { ReportsService } from './application/reports.service';
import { REPORTS_REPOSITORY } from './domain/reports.repository.port';
import { PostgresReportsRepository } from './infrastructure/postgres-reports.repository';
import { ReportsController } from './interfaces/reports.controller';

@Module({
  controllers: [ReportsController],
  providers: [
    ReportsService,
    { provide: REPORTS_REPOSITORY, useClass: PostgresReportsRepository },
  ],
  exports: [ReportsService],
})
export class ReportsModule {}
