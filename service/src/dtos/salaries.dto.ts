import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

class MarkSalaryPaidDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teacher_id!: number;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  salary_year!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  salary_month!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class AddSalaryAdvanceDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teacher_id!: number;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  salary_year!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  salary_month!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** An advance (default) or a part of the salary itself. */
  @IsOptional()
  @IsIn(['advance', 'salary'])
  kind?: 'advance' | 'salary';
}

class UpdateSalaryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsBoolean()
  is_paid?: boolean;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

module.exports = {
  MarkSalaryPaidDto,
  AddSalaryAdvanceDto,
  UpdateSalaryDto,
};

export {};
