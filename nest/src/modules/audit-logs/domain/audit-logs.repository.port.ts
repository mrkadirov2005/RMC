import type { AuditLogsRecord } from './audit-logs.entity';

export const AUDIT_LOGS_REPOSITORY = Symbol('AUDIT_LOGS_REPOSITORY');

export interface AuditLogsRepositoryPort {
  findAll(centerId?: number): Promise<AuditLogsRecord[]>;
  findById(id: number, centerId?: number): Promise<AuditLogsRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<AuditLogsRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<AuditLogsRecord | null>;
  delete(id: number, centerId?: number): Promise<AuditLogsRecord | null>;
}
