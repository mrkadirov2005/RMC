import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

class BulkGradesDto {
  @IsArray()
  @ArrayNotEmpty()
  grades!: any[];
}

class CreateGradeDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  student_id!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  class_id!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teacher_id?: number;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  session_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  marks_obtained?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  total_marks?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  percentage?: number;

  @IsOptional()
  @IsString()
  grade_letter?: string;

  @IsOptional()
  academic_year?: string | number;

  @IsOptional()
  @IsString()
  term?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  attendance_score?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  homework_score?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  activity_score?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  points_score?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  center_id?: number;
}

class UpdateGradeDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  marks_obtained?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  percentage?: number;

  @IsOptional()
  @IsString()
  grade_letter?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  attendance_score?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  homework_score?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  activity_score?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  points_score?: number;
}

module.exports = {
  BulkGradesDto,
  CreateGradeDto,
  UpdateGradeDto,
};

export {};
