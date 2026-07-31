import { describe, expect, it } from 'vitest';
import { getApiPayload, unwrapApiRows } from '../response';

describe('API response adapters', () => {
  it('unwraps axios and nested collection shapes', () => {
    expect(unwrapApiRows<number>({ data: [1, 2] })).toEqual([1, 2]);
    expect(unwrapApiRows<number>({ data: { rows: [3, 4] } })).toEqual([3, 4]);
    expect(unwrapApiRows<number>({ items: [5] })).toEqual([5]);
  });

  it('returns the response payload', () => {
    expect(getApiPayload<{ id: number }>({ data: { id: 7 } })).toEqual({ id: 7 });
  });
});
