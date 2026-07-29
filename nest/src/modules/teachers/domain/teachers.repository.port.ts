import type { TeachersRecord } from './teachers.entity';

export const TEACHERS_REPOSITORY = Symbol('TEACHERS_REPOSITORY');

export interface TeachersRepositoryPort {
  findAll(centerId?: number): Promise<TeachersRecord[]>;
  findById(id: number, centerId?: number): Promise<TeachersRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<TeachersRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<TeachersRecord | null>;
  delete(id: number, centerId?: number): Promise<TeachersRecord | null>;
}
