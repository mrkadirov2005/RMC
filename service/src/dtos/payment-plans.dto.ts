import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

class CreatePaymentPlanDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  student_id!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  center_id!: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @Type(() => Number)
  @IsNumber()
  total_amount!: number;

  @IsDateString()
  start_date!: string;

  @IsOptional()
  @IsArray()
  installments?: any[];
}

module.exports = {
  CreatePaymentPlanDto,
};

export {};
