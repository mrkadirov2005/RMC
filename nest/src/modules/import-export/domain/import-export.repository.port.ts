import type { ImportExportRecord } from './import-export.entity';

export const IMPORT_EXPORT_REPOSITORY = Symbol('IMPORT_EXPORT_REPOSITORY');

export interface ImportExportRepositoryPort {
  findAll(centerId?: number): Promise<ImportExportRecord[]>;
  findById(id: number, centerId?: number): Promise<ImportExportRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<ImportExportRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<ImportExportRecord | null>;
  delete(id: number, centerId?: number): Promise<ImportExportRecord | null>;
}
