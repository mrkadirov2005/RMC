import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

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

module.exports = {
  ImportCsvDto,
};

export {};
