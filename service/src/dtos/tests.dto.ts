import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

class CreateTestDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  center_id?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  subject_id?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  created_by?: number;

  @IsString()
  @IsOptional()
  created_by_type?: string;

  @IsString()
  @IsNotEmpty()
  test_name!: string;

  @IsString()
  @IsNotEmpty()
  test_type!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  instructions?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  total_marks?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  passing_marks?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  duration_minutes?: number;

  @IsString()
  @IsOptional()
  assignment_type?: string;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  is_timed?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  shuffle_questions?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  show_results_immediately?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  allow_retake?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  max_retakes?: number;

  @IsOptional()
  test_data?: any;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  is_private?: boolean;

  @IsDateString()
  @IsOptional()
  start_date?: string;

  @IsDateString()
  @IsOptional()
  end_date?: string;

  @IsArray()
  @IsOptional()
  questions?: any[];

  @IsArray()
  @IsOptional()
  passages?: any[];
}

module.exports = {
  CreateTestDto,
};

export {};
