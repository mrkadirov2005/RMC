import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

class CredentialsDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

class PasswordChangeDto {
  @IsString()
  @IsNotEmpty()
  old_password!: string;

  @IsString()
  @MinLength(6)
  new_password!: string;
}

class SetPasswordDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

class PaymentPasswordDto {
  @IsString()
  @MinLength(6)
  password!: string;
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

class CreateParentDto {
  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  last_name!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  status?: string;
}

class AssignParentStudentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parent_id!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  student_id!: number;

  @IsOptional()
  @IsString()
  relationship?: string;

  @IsOptional()
  is_primary?: boolean;
}

class SearchQueryDto {
  @IsString()
  @MinLength(2)
  q!: string;

  @IsOptional()
  @IsString()
  @IsIn(['students', 'teachers', 'classes', 'payments'])
  entity?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
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

class GenerateClassSessionsDto {
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

class BulkGradesDto {
  @IsArray()
  @ArrayNotEmpty()
  grades!: any[];
}

class ImportCsvDto {
  @IsString()
  @IsNotEmpty()
  csv!: string;
}

class CreateDiscountDto {
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
  discount_type!: string;

  @Type(() => Number)
  @IsNumber()
  value!: number;
}

class CreateRefundDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  payment_id!: number;

  @Type(() => Number)
  @IsNumber()
  amount!: number;
}

class CreateInvoiceDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  student_id!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  center_id!: number;

  @IsDateString()
  issue_date!: string;

  @IsArray()
  @ArrayNotEmpty()
  items!: any[];
}

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

class CreateNotificationDto {
  @IsString()
  @IsIn(['student', 'teacher', 'superuser'])
  user_type!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  user_id!: number;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsString()
  type?: string;
}

class CreateSavedFilterDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  entity!: string;

  @IsNotEmpty()
  filters_json!: any;
}

class CreateTestDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  center_id?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  created_by?: number;

  @IsString()
  @IsNotEmpty()
  test_name!: string;

  @IsString()
  @IsNotEmpty()
  test_type!: string;
}

class CreateAttendanceDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  student_id!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  class_id!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  teacher_id?: number;

  @IsDateString()
  attendance_date!: string;

  @IsString()
  @IsIn(['Present', 'Absent', 'Late', 'Excused'])
  status!: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

module.exports = {
  CredentialsDto,
  PasswordChangeDto,
  SetPasswordDto,
  PaymentPasswordDto,
  StudentCoinTransactionDto,
  CreateParentDto,
  AssignParentStudentDto,
  SearchQueryDto,
  GenerateDebtsDto,
  GenerateClassSessionsDto,
  DeleteUpcomingSessionsDto,
  BulkGradesDto,
  ImportCsvDto,
  CreateDiscountDto,
  CreateRefundDto,
  CreateInvoiceDto,
  CreatePaymentPlanDto,
  CreateNotificationDto,
  CreateSavedFilterDto,
  CreateTestDto,
  CreateAttendanceDto,
};

export {};
