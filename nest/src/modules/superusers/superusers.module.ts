import { Module } from '@nestjs/common';
import { SuperusersService } from './application/superusers.service';
import { SUPERUSERS_REPOSITORY } from './domain/superusers.repository.port';
import { PostgresSuperusersRepository } from './infrastructure/postgres-superusers.repository';
import { SuperusersController } from './interfaces/superusers.controller';

@Module({
  controllers: [SuperusersController],
  providers: [
    SuperusersService,
    { provide: SUPERUSERS_REPOSITORY, useClass: PostgresSuperusersRepository },
  ],
  exports: [SuperusersService],
})
export class SuperusersModule {}
