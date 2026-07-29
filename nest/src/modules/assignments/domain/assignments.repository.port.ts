import type { AssignmentsRecord } from './assignments.entity';

export const ASSIGNMENTS_REPOSITORY = Symbol('ASSIGNMENTS_REPOSITORY');

export interface AssignmentsRepositoryPort {
  findAll(centerId?: number): Promise<AssignmentsRecord[]>;
  findById(id: number, centerId?: number): Promise<AssignmentsRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<AssignmentsRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<AssignmentsRecord | null>;
  delete(id: number, centerId?: number): Promise<AssignmentsRecord | null>;
}
