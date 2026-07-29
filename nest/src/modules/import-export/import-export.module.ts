import { Module } from '@nestjs/common';
import { ImportExportService } from './application/import-export.service';
import { IMPORT_EXPORT_REPOSITORY } from './domain/import-export.repository.port';
import { PostgresImportExportRepository } from './infrastructure/postgres-import-export.repository';
import { ImportExportController } from './interfaces/import-export.controller';

@Module({
  controllers: [ImportExportController],
  providers: [
    ImportExportService,
    { provide: IMPORT_EXPORT_REPOSITORY, useClass: PostgresImportExportRepository },
  ],
  exports: [ImportExportService],
})
export class ImportExportModule {}
