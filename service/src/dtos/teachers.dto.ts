import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEmail, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, Min, MinLength, ValidateIf } from 'class-validator';

class CreateTeacherDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  center_id?: number;

  @IsOptional()
  @IsString()
  employee_id?: string;

  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  last_name!: string;

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

  @IsOptional() @IsDateString() date_of_birth?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() qualification?: string;
  @IsOptional() @IsString() specialization?: string;

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

// A teacher's own settings. top_students_color is a #RRGGBB colour; null or '' is the default.
class UpdateTeacherPreferencesDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: "Rang #RRGGBB ko'rinishida bo'lishi kerak" })
  top_students_color?: string | null;
}

module.exports = {
  CreateTeacherDto,
  UpdateTeacherDto,
  UpdateTeacherPreferencesDto,
};

export {};
