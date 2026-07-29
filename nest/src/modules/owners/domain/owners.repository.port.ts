import type { OwnersRecord } from './owners.entity';

export const OWNERS_REPOSITORY = Symbol('OWNERS_REPOSITORY');

export interface OwnersRepositoryPort {
  findAll(centerId?: number): Promise<OwnersRecord[]>;
  findById(id: number, centerId?: number): Promise<OwnersRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<OwnersRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<OwnersRecord | null>;
  delete(id: number, centerId?: number): Promise<OwnersRecord | null>;
}
