import { ArrayNotEmpty, IsArray } from 'class-validator';

class BulkGradesDto {
  @IsArray()
  @ArrayNotEmpty()
  grades!: any[];
}

module.exports = {
  BulkGradesDto,
};

export {};
