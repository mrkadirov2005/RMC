import { Module } from '@nestjs/common';
import { RoomSlotsService } from './application/room-slots.service';
import { ROOM_SLOTS_REPOSITORY } from './domain/room-slots.repository.port';
import { PostgresRoomSlotsRepository } from './infrastructure/postgres-room-slots.repository';
import { RoomSlotsController } from './interfaces/room-slots.controller';

@Module({
  controllers: [RoomSlotsController],
  providers: [
    RoomSlotsService,
    { provide: ROOM_SLOTS_REPOSITORY, useClass: PostgresRoomSlotsRepository },
  ],
  exports: [RoomSlotsService],
})
export class RoomSlotsModule {}
