import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class ConsolidationWordDto {
  @IsString()
  @IsNotEmpty()
  main_word!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  translations!: string[];
}

class CreateConsolidationSetDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  session_id!: number;

  @IsString()
  @IsOptional()
  title?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  violation_limit?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ConsolidationWordDto)
  words!: ConsolidationWordDto[];
}

class SaveConsolidationAnswerDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  consolidation_word_id!: number;

  @IsString()
  @IsOptional()
  answer?: string;

  // Only meaningful on the public share-link route — binds the request to the
  // trial it actually started. Silently ignored on the authenticated route,
  // which instead verifies ownership via the caller's own JWT.
  @IsString()
  @IsOptional()
  trial_token?: string;
}

class StartPublicTrialDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  // Set once the student has seen the "already completed today, continue anyway?"
  // nudge and confirmed — without it, a repeat completed-today attempt is held back
  // before a trial row is created (see startPublicTrial in consolidation.service.ts).
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  confirm?: boolean;
}

class SetIdParamDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  setId!: number;
}

class TrialIdParamDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  trialId!: number;
}

class ShareTokenParamDto {
  @IsString()
  @IsNotEmpty()
  shareToken!: string;
}

class ShareTokenTrialParamDto extends ShareTokenParamDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  trialId!: number;
}

module.exports = {
  ConsolidationWordDto,
  CreateConsolidationSetDto,
  SaveConsolidationAnswerDto,
  StartPublicTrialDto,
  SetIdParamDto,
  TrialIdParamDto,
  ShareTokenParamDto,
  ShareTokenTrialParamDto,
};

export {};
