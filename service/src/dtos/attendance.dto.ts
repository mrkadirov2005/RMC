import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

class CreateAttendanceDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  student_id!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  class_id!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  teacher_id?: number;

  @IsDateString()
  attendance_date!: string;

  @IsString()
  @IsIn(['Present', 'Absent', 'Late', 'Excused'])
  status!: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

class UpdateAttendanceDto {
  @IsOptional()
  @IsString()
  @IsIn(['Present', 'Absent', 'Late', 'Excused'])
  status?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

module.exports = {
  CreateAttendanceDto,
  UpdateAttendanceDto,
};

export {};
