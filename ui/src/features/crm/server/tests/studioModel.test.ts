import { describe, expect, it } from 'vitest';
import { parseStudioValue, studioInputValue, studioPrimaryKey } from '../studioModel';

const column = (data_type: string, nullable = 'NO') => ({ column_name: 'value', data_type, is_nullable: nullable, column_default: null });
describe('engineering studio values', () => {
  it('parses typed database values', () => {
    expect(parseStudioValue('42', column('integer'))).toBe(42);
    expect(parseStudioValue('false', column('boolean'))).toBe(false);
    expect(parseStudioValue('{"active":true}', column('jsonb'))).toEqual({ active: true });
    expect(parseStudioValue('', column('text', 'YES'))).toBeNull();
  });
  it('serializes objects and builds composite keys', () => {
    expect(studioInputValue({ active: true })).toBe('{"active":true}');
    expect(studioPrimaryKey({ center_id: 2, id: 4, name: 'A' }, ['center_id', 'id'])).toEqual({ center_id: 2, id: 4 });
  });
});
