import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OWNERS_REPOSITORY, type OwnersRepositoryPort } from '../domain/owners.repository.port';

@Injectable()
export class OwnersService {
  constructor(@Inject(OWNERS_REPOSITORY) private readonly repository: OwnersRepositoryPort) {}

  list(centerId?: number) {
    return this.repository.findAll(centerId);
  }

  async get(id: number, centerId?: number) {
    const row = await this.repository.findById(id, centerId);
    if (!row) throw new NotFoundException('Owners record not found');
    return row;
  }

  create(payload: Record<string, unknown>, centerId?: number) {
    return this.repository.create(payload, centerId);
  }

  async update(id: number, payload: Record<string, unknown>, centerId?: number) {
    const row = await this.repository.update(id, payload, centerId);
    if (!row) throw new NotFoundException('Owners record not found');
    return row;
  }

  async remove(id: number, centerId?: number) {
    const row = await this.repository.delete(id, centerId);
    if (!row) throw new NotFoundException('Owners record not found');
    return row;
  }
}
