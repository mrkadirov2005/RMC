import { Module } from '@nestjs/common';
import { SavedFiltersService } from './application/saved-filters.service';
import { SAVED_FILTERS_REPOSITORY } from './domain/saved-filters.repository.port';
import { PostgresSavedFiltersRepository } from './infrastructure/postgres-saved-filters.repository';
import { SavedFiltersController } from './interfaces/saved-filters.controller';

@Module({
  controllers: [SavedFiltersController],
  providers: [
    SavedFiltersService,
    { provide: SAVED_FILTERS_REPOSITORY, useClass: PostgresSavedFiltersRepository },
  ],
  exports: [SavedFiltersService],
})
export class SavedFiltersModule {}
