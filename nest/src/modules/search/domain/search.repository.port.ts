import type { SearchRecord } from './search.entity';

export const SEARCH_REPOSITORY = Symbol('SEARCH_REPOSITORY');

export interface SearchRepositoryPort {
  findAll(centerId?: number): Promise<SearchRecord[]>;
  findById(id: number, centerId?: number): Promise<SearchRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<SearchRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<SearchRecord | null>;
  delete(id: number, centerId?: number): Promise<SearchRecord | null>;
}
