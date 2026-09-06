import { IsObject, IsString, Matches } from 'class-validator';

const TABLE_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

class TableParamDto {
  @IsString()
  @Matches(TABLE_NAME_PATTERN)
  table!: string;
}

class CreateTableRowDto {
  @IsObject()
  values!: Record<string, unknown>;
}

class UpdateTableRowDto {
  @IsObject()
  key!: Record<string, unknown>;

  @IsObject()
  values!: Record<string, unknown>;
}

class DeleteTableRowDto {
  @IsObject()
  key!: Record<string, unknown>;
}

module.exports = {
  TableParamDto,
  CreateTableRowDto,
  UpdateTableRowDto,
  DeleteTableRowDto,
};

export {};
