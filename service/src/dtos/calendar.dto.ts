import { IsNotEmpty, IsString } from 'class-validator';

class RecurringMoveDto {
  @IsString()
  @IsNotEmpty()
  pattern!: string;

  @IsString()
  @IsNotEmpty()
  room_name!: string;

  @IsString()
  @IsNotEmpty()
  start_time!: string;

  @IsString()
  @IsNotEmpty()
  end_time!: string;
}

module.exports = {
  RecurringMoveDto,
};

export {};
