import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

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

class UpdateInvoiceDto {
  @IsOptional()
  @IsDateString()
  issue_date?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discount_total?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tax_total?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  items?: any[];
}

module.exports = {
  CreateInvoiceDto,
  UpdateInvoiceDto,
};

export {};
