import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min, MinLength } from 'class-validator';

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
  PasswordChangeDto,
  SetPasswordDto,
  PaymentPasswordDto,
};

export {};
