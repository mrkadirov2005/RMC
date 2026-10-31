import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

// @MOB-012 validateBody converts types implicitly, which turned 12345 into "12345" before
// @IsString() ran. Keep the value as sent so non-strings are rejected.
const AsSent = () => Transform(({ obj, key }) => obj[key]);

class TranslationItemDto {
  @IsOptional()
  @AsSent()
  @IsString()
  id?: string;

  @IsOptional()
  @AsSent()
  @IsString()
  english?: string;

  @IsOptional()
  @AsSent()
  @IsString()
  uzbek?: string;
}

class SaveTranslationDto {
  @IsOptional()
  @AsSent()
  @IsString()
  id?: string;

  @IsOptional()
  @AsSent()
  @IsString()
  english?: string;

  @IsOptional()
  @AsSent()
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
