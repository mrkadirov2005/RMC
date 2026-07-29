import type { TranslationsRecord } from './translations.entity';

export const TRANSLATIONS_REPOSITORY = Symbol('TRANSLATIONS_REPOSITORY');

export interface TranslationsRepositoryPort {
  findAll(centerId?: number): Promise<TranslationsRecord[]>;
  findById(id: number, centerId?: number): Promise<TranslationsRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<TranslationsRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<TranslationsRecord | null>;
  delete(id: number, centerId?: number): Promise<TranslationsRecord | null>;
}
