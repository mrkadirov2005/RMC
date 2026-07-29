import type { NotificationsRecord } from './notifications.entity';

export const NOTIFICATIONS_REPOSITORY = Symbol('NOTIFICATIONS_REPOSITORY');

export interface NotificationsRepositoryPort {
  findAll(centerId?: number): Promise<NotificationsRecord[]>;
  findById(id: number, centerId?: number): Promise<NotificationsRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<NotificationsRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<NotificationsRecord | null>;
  delete(id: number, centerId?: number): Promise<NotificationsRecord | null>;
}
