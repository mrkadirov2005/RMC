import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

class UpdateSavedFilterDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  filters_json?: any;
}

module.exports = {
  CreateSavedFilterDto,
  UpdateSavedFilterDto,
};

export {};
