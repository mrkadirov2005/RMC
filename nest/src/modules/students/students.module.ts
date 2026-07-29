import { Module } from '@nestjs/common';
import { DiscountsModule } from '../discounts/discounts.module';
import { StudentService } from './application/student.service';
import { STUDENT_REPOSITORY } from './domain/student.repository.port';
import { PostgresStudentRepository } from './infrastructure/postgres-student.repository';
import { StudentsController } from './interfaces/students.controller';

@Module({
  imports: [DiscountsModule],
  controllers: [StudentsController],
  providers: [
    StudentService,
    { provide: STUDENT_REPOSITORY, useClass: PostgresStudentRepository },
  ],
  exports: [StudentService],
})
export class StudentsModule {}
