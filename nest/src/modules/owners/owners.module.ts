import { Module } from '@nestjs/common';
import { OwnersService } from './application/owners.service';
import { OWNERS_REPOSITORY } from './domain/owners.repository.port';
import { PostgresOwnersRepository } from './infrastructure/postgres-owners.repository';
import { OwnersController } from './interfaces/owners.controller';

@Module({
  controllers: [OwnersController],
  providers: [
    OwnersService,
    { provide: OWNERS_REPOSITORY, useClass: PostgresOwnersRepository },
  ],
  exports: [OwnersService],
})
export class OwnersModule {}
