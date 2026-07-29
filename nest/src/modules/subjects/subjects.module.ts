import { Module } from '@nestjs/common';
import { SubjectsService } from './application/subjects.service';
import { SUBJECTS_REPOSITORY } from './domain/subjects.repository.port';
import { PostgresSubjectsRepository } from './infrastructure/postgres-subjects.repository';
import { SubjectsController } from './interfaces/subjects.controller';

@Module({
  controllers: [SubjectsController],
  providers: [
    SubjectsService,
    { provide: SUBJECTS_REPOSITORY, useClass: PostgresSubjectsRepository },
  ],
  exports: [SubjectsService],
})
export class SubjectsModule {}
