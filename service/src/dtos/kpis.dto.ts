import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

class UpsertKpiDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teacher_id!: number;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  kpi_year!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  kpi_month!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  contribution_score!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  teaching_quality_score!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

module.exports = {
  UpsertKpiDto,
};

export {};
