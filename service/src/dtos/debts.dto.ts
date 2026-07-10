import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

class GenerateDebtsDto {
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  student_ids!: number[];

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  monthly_fee!: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}

module.exports = {
  GenerateDebtsDto,
};

export {};
