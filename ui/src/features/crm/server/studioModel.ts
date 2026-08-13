export type StudioColumn = { column_name: string; data_type: string; is_nullable: string; column_default: string | null };
export const studioInputValue = (value: unknown) => value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
export const parseStudioValue = (value: string, column: StudioColumn) => {
  if (value === '' && column.is_nullable === 'YES') return null;
  if (['smallint', 'integer', 'bigint', 'numeric', 'decimal', 'real', 'double precision'].includes(column.data_type)) {
    const number = Number(value); if (!Number.isFinite(number)) throw new Error(`${column.column_name} must be a number.`); return number;
  }
  if (column.data_type === 'boolean') {
    if (!['true', 'false'].includes(value.toLowerCase())) throw new Error(`${column.column_name} must be true or false.`);
    return value.toLowerCase() === 'true';
  }
  if (column.data_type === 'json' || column.data_type === 'jsonb') return JSON.parse(value);
  return value;
};
export const studioPrimaryKey = (row: Record<string, unknown>, columns: string[]) => Object.fromEntries(columns.map(column => [column, row[column]]));
