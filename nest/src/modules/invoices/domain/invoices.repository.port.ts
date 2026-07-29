import type { InvoicesRecord } from './invoices.entity';

export const INVOICES_REPOSITORY = Symbol('INVOICES_REPOSITORY');

export interface InvoicesRepositoryPort {
  findAll(centerId?: number): Promise<InvoicesRecord[]>;
  findById(id: number, centerId?: number): Promise<InvoicesRecord | null>;
  create(payload: Record<string, unknown>, centerId?: number): Promise<InvoicesRecord>;
  update(id: number, payload: Record<string, unknown>, centerId?: number): Promise<InvoicesRecord | null>;
  delete(id: number, centerId?: number): Promise<InvoicesRecord | null>;
}
