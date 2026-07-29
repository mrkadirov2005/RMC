import { Module } from '@nestjs/common';
import { CentersService } from './application/centers.service';
import { CENTERS_REPOSITORY } from './domain/centers.repository.port';
import { PostgresCentersRepository } from './infrastructure/postgres-centers.repository';
import { CentersController } from './interfaces/centers.controller';

@Module({
  controllers: [CentersController],
  providers: [
    CentersService,
    { provide: CENTERS_REPOSITORY, useClass: PostgresCentersRepository },
  ],
  exports: [CentersService],
})
export class CentersModule {}
