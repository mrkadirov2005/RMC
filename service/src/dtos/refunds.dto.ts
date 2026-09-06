import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, Min } from 'class-validator';

class CreateRefundDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  payment_id!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;
}

module.exports = {
  CreateRefundDto,
};

export {};
