import { Module } from '@nestjs/common';
import { TranslationsService } from './application/translations.service';
import { TRANSLATIONS_REPOSITORY } from './domain/translations.repository.port';
import { PostgresTranslationsRepository } from './infrastructure/postgres-translations.repository';
import { TranslationsController } from './interfaces/translations.controller';

@Module({
  controllers: [TranslationsController],
  providers: [
    TranslationsService,
    { provide: TRANSLATIONS_REPOSITORY, useClass: PostgresTranslationsRepository },
  ],
  exports: [TranslationsService],
})
export class TranslationsModule {}
