import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

class CreateDebtDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  student_id!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  center_id?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  debt_amount!: number;

  @IsOptional()
  @IsDateString()
  debt_date?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount_paid?: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}

class UpdateDebtDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  debt_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  center_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  student_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  debt_amount?: number;

  @IsOptional()
  @IsDateString()
  debt_date?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount_paid?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  balance?: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  created_at?: any;

  @IsOptional()
  updated_at?: any;
}

class GenerateDebtsDto {
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  student_ids!: number[];

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  monthly_fee!: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}

module.exports = {
  CreateDebtDto,
  UpdateDebtDto,
  GenerateDebtsDto,
};

export {};
