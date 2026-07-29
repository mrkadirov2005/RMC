import type { GradesRecord } from './grades.entity';

export const GRADES_REPOSITORY = Symbol('GRADES_REPOSITORY');

export interface GradesRepositoryPort {
  findAll(centerId?: number): Promise<GradesRecord[]>;
  findById(id: number, centerId?: number): Promise<GradesRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<GradesRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<GradesRecord | null>;
  delete(id: number, centerId?: number): Promise<GradesRecord | null>;
}
