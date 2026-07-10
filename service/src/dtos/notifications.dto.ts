import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

class CreateNotificationDto {
  @IsString()
  @IsIn(['student', 'teacher', 'superuser'])
  user_type!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  user_id!: number;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsString()
  type?: string;
}

module.exports = {
  CreateNotificationDto,
};

export {};
