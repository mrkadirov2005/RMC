import type { SessionsRecord } from './sessions.entity';

export const SESSIONS_REPOSITORY = Symbol('SESSIONS_REPOSITORY');

export interface SessionsRepositoryPort {
  findAll(centerId?: number): Promise<SessionsRecord[]>;
  findById(id: number, centerId?: number): Promise<SessionsRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<SessionsRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<SessionsRecord | null>;
  delete(id: number, centerId?: number): Promise<SessionsRecord | null>;
}
