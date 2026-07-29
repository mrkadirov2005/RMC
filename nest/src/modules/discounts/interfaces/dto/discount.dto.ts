import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDiscountDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  student_id: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  center_id?: number;

  @IsOptional()
  @IsIn(['fixed', 'percent'])
  discount_type?: 'fixed' | 'percent';

  @IsOptional()
  @IsIn(['serial_discount', 'monthly_discount'])
  discount_kind?: 'serial_discount' | 'monthly_discount';

  @IsOptional()
  @IsIn(['fixed', 'percent'])
  value_type?: 'fixed' | 'percent';

  @Type(() => Number)
  @IsNumber()
  value: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  original_price?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  final_price?: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  payment_period?: string;

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

export class UpdateDiscountDto extends CreateDiscountDto {
  @IsOptional()
  declare student_id: number;

  @IsOptional()
  declare value: number;
}
