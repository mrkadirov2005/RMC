import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min, MinLength } from 'class-validator';

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

class UpdateParentDto {
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

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

module.exports = {
  CreateParentDto,
  UpdateParentDto,
  AssignParentStudentDto,
};

export {};
