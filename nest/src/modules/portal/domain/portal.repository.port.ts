import type { PortalRecord } from './portal.entity';

export const PORTAL_REPOSITORY = Symbol('PORTAL_REPOSITORY');

export interface PortalRepositoryPort {
  findAll(centerId?: number): Promise<PortalRecord[]>;
  findById(id: number, centerId?: number): Promise<PortalRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<PortalRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<PortalRecord | null>;
  delete(id: number, centerId?: number): Promise<PortalRecord | null>;
}
