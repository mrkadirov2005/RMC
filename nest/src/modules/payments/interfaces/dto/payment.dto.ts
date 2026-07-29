import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
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
  @IsString()
  payment_date?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsString()
  payment_status?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  payment_type?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  transaction_reference?: string;

  @IsOptional()
  @IsString()
  receipt_number?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  discount_id?: number;

  @IsOptional()
  @IsIn(['serial_discount', 'monthly_discount'])
  discount_kind?: string;

  @IsOptional()
  @IsIn(['fixed', 'percent'])
  discount_value_type?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  discount_value?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  original_amount?: number;

  @IsOptional()
  @IsBoolean()
  is_complete?: boolean;
}

export class UpdatePaymentDto {
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  payment_status?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
