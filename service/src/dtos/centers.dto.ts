import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

class CreateCenterDto {
  @IsString()
  @IsNotEmpty()
  center_name!: string;

  @IsOptional()
  @IsString()
  center_code?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  principal_name?: string;
}

class UpdateCenterDto {
  @IsOptional()
  @IsString()
  center_name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  principal_name?: string;
}

module.exports = {
  CreateCenterDto,
  UpdateCenterDto,
};

export {};
