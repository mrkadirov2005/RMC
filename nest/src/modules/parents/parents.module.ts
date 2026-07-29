import { Module } from '@nestjs/common';
import { ParentsService } from './application/parents.service';
import { PARENTS_REPOSITORY } from './domain/parents.repository.port';
import { PostgresParentsRepository } from './infrastructure/postgres-parents.repository';
import { ParentsController } from './interfaces/parents.controller';

@Module({
  controllers: [ParentsController],
  providers: [
    ParentsService,
    { provide: PARENTS_REPOSITORY, useClass: PostgresParentsRepository },
  ],
  exports: [ParentsService],
})
export class ParentsModule {}
