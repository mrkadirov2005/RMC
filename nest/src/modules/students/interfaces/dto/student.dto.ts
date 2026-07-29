import { IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStudentDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  center_id?: number;

  @IsOptional()
  @IsString()
  enrollment_number?: string;

  @IsString()
  first_name: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  teacher_id?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  class_id?: number;

  @IsOptional()
  @IsString()
  school_name?: string;

  @IsOptional()
  @IsString()
  school_class?: string;

  @IsOptional()
  @IsBoolean()
  is_frozen?: boolean;

  @IsOptional()
  @IsBoolean()
  is_discounted?: boolean;

  @IsOptional()
  @IsIn(['serial_discount', 'monthly_discount'])
  discount_kind?: string;

  @IsOptional()
  @IsIn(['fixed', 'percent'])
  discount_value_type?: string;

  @Type(() => Number)
  @IsOptional()
  discount_value?: number;

  @Type(() => Number)
  @IsOptional()
  discount_original_price?: number;

  @IsOptional()
  @IsString()
  discount_reason?: string;
}

export class UpdateStudentDto extends CreateStudentDto {
  @IsOptional()
  declare first_name: string;
}

export class TransferStudentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  target_class_id: number;
}
