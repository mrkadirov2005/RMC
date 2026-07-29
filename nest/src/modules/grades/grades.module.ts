import { Module } from '@nestjs/common';
import { GradesService } from './application/grades.service';
import { GRADES_REPOSITORY } from './domain/grades.repository.port';
import { PostgresGradesRepository } from './infrastructure/postgres-grades.repository';
import { GradesController } from './interfaces/grades.controller';

@Module({
  controllers: [GradesController],
  providers: [
    GradesService,
    { provide: GRADES_REPOSITORY, useClass: PostgresGradesRepository },
  ],
  exports: [GradesService],
})
export class GradesModule {}
