import { Module } from '@nestjs/common';
import { AttendanceService } from './application/attendance.service';
import { ATTENDANCE_REPOSITORY } from './domain/attendance.repository.port';
import { PostgresAttendanceRepository } from './infrastructure/postgres-attendance.repository';
import { AttendanceController } from './interfaces/attendance.controller';

@Module({
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    { provide: ATTENDANCE_REPOSITORY, useClass: PostgresAttendanceRepository },
  ],
  exports: [AttendanceService],
})
export class AttendanceModule {}
