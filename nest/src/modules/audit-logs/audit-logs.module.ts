import { Module } from '@nestjs/common';
import { AuditLogsService } from './application/audit-logs.service';
import { AUDIT_LOGS_REPOSITORY } from './domain/audit-logs.repository.port';
import { PostgresAuditLogsRepository } from './infrastructure/postgres-audit-logs.repository';
import { AuditLogsController } from './interfaces/audit-logs.controller';

@Module({
  controllers: [AuditLogsController],
  providers: [
    AuditLogsService,
    { provide: AUDIT_LOGS_REPOSITORY, useClass: PostgresAuditLogsRepository },
  ],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
