import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IMPORT_EXPORT_REPOSITORY, type ImportExportRepositoryPort } from '../domain/import-export.repository.port';

@Injectable()
export class ImportExportService {
  constructor(@Inject(IMPORT_EXPORT_REPOSITORY) private readonly repository: ImportExportRepositoryPort) {}

  list(centerId?: number) {
    return this.repository.findAll(centerId);
  }

  async get(id: number, centerId?: number) {
    const row = await this.repository.findById(id, centerId);
    if (!row) throw new NotFoundException('ImportExport record not found');
    return row;
  }

  create(payload: Record<string, unknown>, centerId?: number) {
    return this.repository.create(payload, centerId);
  }

  async update(id: number, payload: Record<string, unknown>, centerId?: number) {
    const row = await this.repository.update(id, payload, centerId);
    if (!row) throw new NotFoundException('ImportExport record not found');
    return row;
  }

  async remove(id: number, centerId?: number) {
    const row = await this.repository.delete(id, centerId);
    if (!row) throw new NotFoundException('ImportExport record not found');
    return row;
  }
}
