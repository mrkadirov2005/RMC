import { Module } from '@nestjs/common';
import { ClassesService } from './application/classes.service';
import { CLASSES_REPOSITORY } from './domain/classes.repository.port';
import { PostgresClassesRepository } from './infrastructure/postgres-classes.repository';
import { ClassesController } from './interfaces/classes.controller';

@Module({
  controllers: [ClassesController],
  providers: [
    ClassesService,
    { provide: CLASSES_REPOSITORY, useClass: PostgresClassesRepository },
  ],
  exports: [ClassesService],
})
export class ClassesModule {}
