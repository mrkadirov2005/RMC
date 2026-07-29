import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TELEGRAM_REGISTRATIONS_REPOSITORY, type TelegramRegistrationsRepositoryPort } from '../domain/telegram-registrations.repository.port';

@Injectable()
export class TelegramRegistrationsService {
  constructor(@Inject(TELEGRAM_REGISTRATIONS_REPOSITORY) private readonly repository: TelegramRegistrationsRepositoryPort) {}

  list(centerId?: number) {
    return this.repository.findAll(centerId);
  }

  async get(id: number, centerId?: number) {
    const row = await this.repository.findById(id, centerId);
    if (!row) throw new NotFoundException('TelegramRegistrations record not found');
    return row;
  }

  create(payload: Record<string, unknown>, centerId?: number) {
    return this.repository.create(payload, centerId);
  }

  async update(id: number, payload: Record<string, unknown>, centerId?: number) {
    const row = await this.repository.update(id, payload, centerId);
    if (!row) throw new NotFoundException('TelegramRegistrations record not found');
    return row;
  }

  async remove(id: number, centerId?: number) {
    const row = await this.repository.delete(id, centerId);
    if (!row) throw new NotFoundException('TelegramRegistrations record not found');
    return row;
  }
}
