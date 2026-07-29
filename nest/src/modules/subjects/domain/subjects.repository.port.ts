import type { SubjectsRecord } from './subjects.entity';

export const SUBJECTS_REPOSITORY = Symbol('SUBJECTS_REPOSITORY');

export interface SubjectsRepositoryPort {
  findAll(centerId?: number): Promise<SubjectsRecord[]>;
  findById(id: number, centerId?: number): Promise<SubjectsRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<SubjectsRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<SubjectsRecord | null>;
  delete(id: number, centerId?: number): Promise<SubjectsRecord | null>;
}
