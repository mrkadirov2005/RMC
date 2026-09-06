import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional } from 'class-validator';

class SaveLessonScoringDto {
  @IsOptional()
  @IsArray()
  attendance?: any[];

  @IsOptional()
  @IsArray()
  homework?: any[];

  @IsOptional()
  @IsArray()
  activity?: any[];

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  stellarBonusCoins?: number;

  @IsOptional()
  @IsArray()
  coinScoreMapping?: any[];
}

class SaveOwnerPaletteDto {
  @IsOptional()
  palette?: any;
}

class SaveVisualOverridesDto {
  @IsOptional()
  @IsArray()
  overrides?: any[];
}

module.exports = {
  SaveLessonScoringDto,
  SaveOwnerPaletteDto,
  SaveVisualOverridesDto,
};

export {};
