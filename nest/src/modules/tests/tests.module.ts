import { Module } from '@nestjs/common';
import { TestsService } from './application/tests.service';
import { TESTS_REPOSITORY } from './domain/tests.repository.port';
import { PostgresTestsRepository } from './infrastructure/postgres-tests.repository';
import { TestsController } from './interfaces/tests.controller';

@Module({
  controllers: [TestsController],
  providers: [
    TestsService,
    { provide: TESTS_REPOSITORY, useClass: PostgresTestsRepository },
  ],
  exports: [TestsService],
})
export class TestsModule {}
