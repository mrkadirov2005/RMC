import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

class CreateDiscountDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  student_id!: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  center_id?: number;

  @IsOptional()
  @IsString()
  discount_type?: string;

  @IsOptional()
  @IsIn(['serial_discount', 'monthly_discount'])
  discount_kind?: string;

  @IsOptional()
  @IsIn(['percent', 'fixed'])
  value_type?: string;

  @Type(() => Number)
  @IsNumber()
  value!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  original_price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  final_price?: number;

  @IsOptional()
  @IsString()
  payment_period?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

class UpdateDiscountDto {
  @IsOptional()
  @IsString()
  discount_type?: string;

  @IsOptional()
  @IsIn(['serial_discount', 'monthly_discount'])
  discount_kind?: string;

  @IsOptional()
  @IsIn(['percent', 'fixed'])
  value_type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  value?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  original_price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  final_price?: number;

  @IsOptional()
  @IsString()
  payment_period?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

module.exports = {
  CreateDiscountDto,
  UpdateDiscountDto,
};

export {};
