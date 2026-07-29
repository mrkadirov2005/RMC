import type { RoomSlotsRecord } from './room-slots.entity';

export const ROOM_SLOTS_REPOSITORY = Symbol('ROOM_SLOTS_REPOSITORY');

export interface RoomSlotsRepositoryPort {
  findAll(centerId?: number): Promise<RoomSlotsRecord[]>;
  findById(id: number, centerId?: number): Promise<RoomSlotsRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<RoomSlotsRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<RoomSlotsRecord | null>;
  delete(id: number, centerId?: number): Promise<RoomSlotsRecord | null>;
}
