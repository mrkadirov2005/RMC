import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ROOM_SLOTS_REPOSITORY, type RoomSlotsRepositoryPort } from '../domain/room-slots.repository.port';

@Injectable()
export class RoomSlotsService {
  constructor(@Inject(ROOM_SLOTS_REPOSITORY) private readonly repository: RoomSlotsRepositoryPort) {}

  list(centerId?: number) {
    return this.repository.findAll(centerId);
  }

  async get(id: number, centerId?: number) {
    const row = await this.repository.findById(id, centerId);
    if (!row) throw new NotFoundException('RoomSlots record not found');
    return row;
  }

  create(payload: Record<string, unknown>, centerId?: number) {
    return this.repository.create(payload, centerId);
  }

  async update(id: number, payload: Record<string, unknown>, centerId?: number) {
    const row = await this.repository.update(id, payload, centerId);
    if (!row) throw new NotFoundException('RoomSlots record not found');
    return row;
  }

  async remove(id: number, centerId?: number) {
    const row = await this.repository.delete(id, centerId);
    if (!row) throw new NotFoundException('RoomSlots record not found');
    return row;
  }
}
