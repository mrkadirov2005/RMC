import { Module } from '@nestjs/common';
import { PortalService } from './application/portal.service';
import { PORTAL_REPOSITORY } from './domain/portal.repository.port';
import { PostgresPortalRepository } from './infrastructure/postgres-portal.repository';
import { PortalController } from './interfaces/portal.controller';

@Module({
  controllers: [PortalController],
  providers: [
    PortalService,
    { provide: PORTAL_REPOSITORY, useClass: PostgresPortalRepository },
  ],
  exports: [PortalService],
})
export class PortalModule {}
