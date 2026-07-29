import { Module } from '@nestjs/common';
import { RoomsService } from './application/rooms.service';
import { ROOMS_REPOSITORY } from './domain/rooms.repository.port';
import { PostgresRoomsRepository } from './infrastructure/postgres-rooms.repository';
import { RoomsController } from './interfaces/rooms.controller';

@Module({
  controllers: [RoomsController],
  providers: [
    RoomsService,
    { provide: ROOMS_REPOSITORY, useClass: PostgresRoomsRepository },
  ],
  exports: [RoomsService],
})
export class RoomsModule {}
