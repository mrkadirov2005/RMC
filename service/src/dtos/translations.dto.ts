import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

class TranslationItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  english?: string;

  @IsOptional()
  @IsString()
  uzbek?: string;
}

class SaveTranslationDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  english?: string;

  @IsOptional()
  @IsString()
  uzbek?: string;
}

class BulkUpsertTranslationsDto {
  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => TranslationItemDto)
  translations!: TranslationItemDto[];
}

module.exports = {
  TranslationItemDto,
  SaveTranslationDto,
  BulkUpsertTranslationsDto,
};

export {};
