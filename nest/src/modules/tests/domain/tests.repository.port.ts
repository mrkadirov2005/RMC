import type { TestsRecord } from './tests.entity';

export const TESTS_REPOSITORY = Symbol('TESTS_REPOSITORY');

export interface TestsRepositoryPort {
  findAll(centerId?: number): Promise<TestsRecord[]>;
  findById(id: number, centerId?: number): Promise<TestsRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<TestsRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<TestsRecord | null>;
  delete(id: number, centerId?: number): Promise<TestsRecord | null>;
}
