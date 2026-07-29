import { Module } from '@nestjs/common';
import { AssignmentsService } from './application/assignments.service';
import { ASSIGNMENTS_REPOSITORY } from './domain/assignments.repository.port';
import { PostgresAssignmentsRepository } from './infrastructure/postgres-assignments.repository';
import { AssignmentsController } from './interfaces/assignments.controller';

@Module({
  controllers: [AssignmentsController],
  providers: [
    AssignmentsService,
    { provide: ASSIGNMENTS_REPOSITORY, useClass: PostgresAssignmentsRepository },
  ],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
