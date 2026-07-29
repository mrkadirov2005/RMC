import type { SavedFiltersRecord } from './saved-filters.entity';

export const SAVED_FILTERS_REPOSITORY = Symbol('SAVED_FILTERS_REPOSITORY');

export interface SavedFiltersRepositoryPort {
  findAll(centerId?: number): Promise<SavedFiltersRecord[]>;
  findById(id: number, centerId?: number): Promise<SavedFiltersRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<SavedFiltersRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<SavedFiltersRecord | null>;
  delete(id: number, centerId?: number): Promise<SavedFiltersRecord | null>;
}
