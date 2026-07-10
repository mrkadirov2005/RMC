import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEmail, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

class StudentListQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  school_name?: string;

  @IsOptional()
  @IsBoolean()
  is_discounted?: boolean;

  @IsOptional()
  @IsIn(['percent', 'fixed'])
  discount_value_type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount_value?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount_original_price?: number;

  @IsOptional()
  @IsString()
  discount_reason?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  class_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  subject_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  level?: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  age?: number;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

class CreateStudentDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  center_id?: number;

  @IsString()
  @IsNotEmpty()
  enrollment_number!: string;

  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  last_name!: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @IsOptional()
  @IsString()
  parent_name?: string;

  @IsOptional()
  @IsString()
  parent_phone?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teacher_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  class_id?: number;

  @IsOptional()
  @IsString()
  school_name?: string;

  @IsOptional()
  @IsString()
  school_class?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_frozen?: boolean;
}

class UpdateStudentDto {
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  class_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teacher_id?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_frozen?: boolean;

  @IsOptional()
  @IsString()
  school_name?: string;

  @IsOptional()
  @IsString()
  school_class?: string;
}

class TransferStudentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  target_class_id!: number;
}

class StudentCoinTransactionDto {
  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  @IsIn(['add', 'subtract', 'ADD', 'SUBTRACT'])
  direction?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

module.exports = {
  StudentListQueryDto,
  CreateStudentDto,
  UpdateStudentDto,
  TransferStudentDto,
  StudentCoinTransactionDto,
};

export {};
