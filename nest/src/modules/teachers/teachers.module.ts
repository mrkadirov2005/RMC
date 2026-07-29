import { Module } from '@nestjs/common';
import { TeachersService } from './application/teachers.service';
import { TEACHERS_REPOSITORY } from './domain/teachers.repository.port';
import { PostgresTeachersRepository } from './infrastructure/postgres-teachers.repository';
import { TeachersController } from './interfaces/teachers.controller';

@Module({
  controllers: [TeachersController],
  providers: [
    TeachersService,
    { provide: TEACHERS_REPOSITORY, useClass: PostgresTeachersRepository },
  ],
  exports: [TeachersService],
})
export class TeachersModule {}
