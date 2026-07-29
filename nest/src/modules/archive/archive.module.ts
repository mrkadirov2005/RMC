import { Module } from '@nestjs/common';
import { ArchiveService } from './application/archive.service';
import { ARCHIVE_REPOSITORY } from './domain/archive.repository.port';
import { PostgresArchiveRepository } from './infrastructure/postgres-archive.repository';
import { ArchiveController } from './interfaces/archive.controller';

@Module({
  controllers: [ArchiveController],
  providers: [
    ArchiveService,
    { provide: ARCHIVE_REPOSITORY, useClass: PostgresArchiveRepository },
  ],
  exports: [ArchiveService],
})
export class ArchiveModule {}
