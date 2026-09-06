import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

class ConvertTelegramRegistrationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  class_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teacher_id?: number;
}

module.exports = {
  ConvertTelegramRegistrationDto,
};

export {};
