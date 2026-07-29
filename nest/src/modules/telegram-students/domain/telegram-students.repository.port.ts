import type { TelegramStudentsRecord } from './telegram-students.entity';

export const TELEGRAM_STUDENTS_REPOSITORY = Symbol('TELEGRAM_STUDENTS_REPOSITORY');

export interface TelegramStudentsRepositoryPort {
  findAll(centerId?: number): Promise<TelegramStudentsRecord[]>;
  findById(id: number, centerId?: number): Promise<TelegramStudentsRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<TelegramStudentsRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<TelegramStudentsRecord | null>;
  delete(id: number, centerId?: number): Promise<TelegramStudentsRecord | null>;
}
