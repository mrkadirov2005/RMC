import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

class CreateClassDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  center_id?: number;

  @IsString()
  @IsNotEmpty()
  class_name!: string;

  @IsString()
  @IsNotEmpty()
  subject_name!: string;

  @IsOptional()
  @IsString()
  class_code?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  level?: number;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teacher_id?: number;

  @IsOptional()
  @IsString()
  room_number?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  payment_amount?: number;

  @IsOptional()
  @IsString()
  payment_frequency?: string;
}

class UpdateClassDto {
  @IsOptional()
  @IsString()
  class_name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  subject_name?: string;

  @IsOptional()
  @IsString()
  class_code?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  level?: number;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teacher_id?: number;

  @IsOptional()
  @IsString()
  room_number?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  payment_amount?: number;
}

class CreateClassSessionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  center_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teacher_id?: number;

  @IsDateString()
  session_date!: string;

  @IsString()
  @IsNotEmpty()
  start_time!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration_minutes?: number;
}

class GenerateClassSessionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  center_id?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration_minutes?: number;
}

class DeleteUpcomingSessionsDto {
  @IsDateString()
  from!: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

module.exports = {
  CreateClassDto,
  UpdateClassDto,
  CreateClassSessionDto,
  GenerateClassSessionsDto,
  DeleteUpcomingSessionsDto,
};

export {};
