import { IsNotEmpty, IsString } from 'class-validator';

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

module.exports = {
  CreateSavedFilterDto,
};

export {};
