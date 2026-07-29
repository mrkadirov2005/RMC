import type { ArchiveRecord } from './archive.entity';

export const ARCHIVE_REPOSITORY = Symbol('ARCHIVE_REPOSITORY');

export interface ArchiveRepositoryPort {
  findAll(centerId?: number): Promise<ArchiveRecord[]>;
  findById(id: number, centerId?: number): Promise<ArchiveRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<ArchiveRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<ArchiveRecord | null>;
  delete(id: number, centerId?: number): Promise<ArchiveRecord | null>;
}
