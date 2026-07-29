import type { RoomsRecord } from './rooms.entity';

export const ROOMS_REPOSITORY = Symbol('ROOMS_REPOSITORY');

export interface RoomsRepositoryPort {
  findAll(centerId?: number): Promise<RoomsRecord[]>;
  findById(id: number, centerId?: number): Promise<RoomsRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<RoomsRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<RoomsRecord | null>;
  delete(id: number, centerId?: number): Promise<RoomsRecord | null>;
}
