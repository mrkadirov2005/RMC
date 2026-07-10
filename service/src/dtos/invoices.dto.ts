import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsDateString, IsIn, IsInt, Min } from 'class-validator';

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

module.exports = {
  CreateInvoiceDto,
};

export {};
