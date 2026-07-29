import type { ClassesRecord } from './classes.entity';

export const CLASSES_REPOSITORY = Symbol('CLASSES_REPOSITORY');

export interface ClassesRepositoryPort {
  findAll(centerId?: number): Promise<ClassesRecord[]>;
  findById(id: number, centerId?: number): Promise<ClassesRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<ClassesRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<ClassesRecord | null>;
  delete(id: number, centerId?: number): Promise<ClassesRecord | null>;
}
