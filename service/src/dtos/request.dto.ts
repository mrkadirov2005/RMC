import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
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

class IdParamDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id!: number;
}

class StudentIdParamDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  studentId!: number;
}

class ClassIdParamDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  classId!: number;
}

class SessionIdParamDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sessionId!: number;
}

class EntityParamDto {
  @IsString()
  @IsIn(['students', 'teachers', 'classes', 'payments', 'rooms', 'assignments', 'subjects'])
  entity!: string;
}

class ClassSessionParamDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  sessionId!: number;
}

class StudentCoinTransactionParamDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  transactionId!: number;
}

class ForceQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['true', 'false', ''])
  force?: string;
}

class CredentialsDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

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

class CreateTeacherDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  center_id?: number;

  @IsString()
  @IsNotEmpty()
  employee_id!: string;

  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  last_name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  qualification?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  salary_percentage?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @IsOptional()
  @IsString()
  @MinLength(3)
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

class UpdateTeacherDto {
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
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  salary_percentage?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];
}

class CreateClassDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  center_id?: number;

  @IsString()
  @IsNotEmpty()
  class_name!: string;

  @IsOptional()
  @IsString()
  class_code?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  level?: number;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teacher_id?: number;

  @IsOptional()
  @IsString()
  room_number?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  payment_amount?: number;

  @IsOptional()
  @IsString()
  payment_frequency?: string;
}

class UpdateClassDto {
  @IsOptional()
  @IsString()
  class_name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  level?: number;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teacher_id?: number;

  @IsOptional()
  @IsString()
  room_number?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  payment_amount?: number;
}

class CreateClassSessionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  center_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teacher_id?: number;

  @IsDateString()
  session_date!: string;

  @IsString()
  @IsNotEmpty()
  start_time!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration_minutes?: number;
}

class CreatePaymentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  student_id!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  center_id?: number;

  @IsOptional()
  @IsDateString()
  payment_date?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsString()
  transaction_reference?: string;

  @IsOptional()
  @IsString()
  receipt_number?: string;

  @IsOptional()
  @IsString()
  payment_status?: string;

  @IsOptional()
  @IsString()
  payment_type?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdatePaymentDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  payment_status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
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
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  center_id?: number;

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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  center_id?: number;
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
  subject_id?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  created_by?: number;

  @IsString()
  @IsOptional()
  created_by_type?: string;

  @IsString()
  @IsNotEmpty()
  test_name!: string;

  @IsString()
  @IsNotEmpty()
  test_type!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  instructions?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  total_marks?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  passing_marks?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  duration_minutes?: number;

  @IsString()
  @IsOptional()
  assignment_type?: string;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  is_timed?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  shuffle_questions?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  show_results_immediately?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  allow_retake?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  max_retakes?: number;

  @IsOptional()
  test_data?: any;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  is_private?: boolean;

  @IsDateString()
  @IsOptional()
  start_date?: string;

  @IsDateString()
  @IsOptional()
  end_date?: string;

  @IsArray()
  @IsOptional()
  questions?: any[];

  @IsArray()
  @IsOptional()
  passages?: any[];
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
  IdParamDto,
  StudentIdParamDto,
  ClassIdParamDto,
  SessionIdParamDto,
  EntityParamDto,
  ClassSessionParamDto,
  StudentCoinTransactionParamDto,
  ForceQueryDto,
  CredentialsDto,
  StudentListQueryDto,
  CreateStudentDto,
  UpdateStudentDto,
  TransferStudentDto,
  CreateTeacherDto,
  UpdateTeacherDto,
  CreateClassDto,
  UpdateClassDto,
  CreateClassSessionDto,
  CreatePaymentDto,
  UpdatePaymentDto,
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
