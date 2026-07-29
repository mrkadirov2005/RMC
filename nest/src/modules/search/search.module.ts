import { Module } from '@nestjs/common';
import { SearchService } from './application/search.service';
import { SEARCH_REPOSITORY } from './domain/search.repository.port';
import { PostgresSearchRepository } from './infrastructure/postgres-search.repository';
import { SearchController } from './interfaces/search.controller';

@Module({
  controllers: [SearchController],
  providers: [
    SearchService,
    { provide: SEARCH_REPOSITORY, useClass: PostgresSearchRepository },
  ],
  exports: [SearchService],
})
export class SearchModule {}
