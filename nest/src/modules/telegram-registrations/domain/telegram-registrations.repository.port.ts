import type { TelegramRegistrationsRecord } from './telegram-registrations.entity';

export const TELEGRAM_REGISTRATIONS_REPOSITORY = Symbol('TELEGRAM_REGISTRATIONS_REPOSITORY');

export interface TelegramRegistrationsRepositoryPort {
  findAll(centerId?: number): Promise<TelegramRegistrationsRecord[]>;
  findById(id: number, centerId?: number): Promise<TelegramRegistrationsRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<TelegramRegistrationsRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<TelegramRegistrationsRecord | null>;
  delete(id: number, centerId?: number): Promise<TelegramRegistrationsRecord | null>;
}
