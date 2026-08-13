import { describe, expect, it } from 'vitest';
import { buildRoomNumberOptions } from '../classFormOptions';

describe('class form room options', () => {
  it('deduplicates rooms and sorts room numbers naturally', () => {
    expect(buildRoomNumberOptions([
      { name: '10 xona' },
      { name: '2 xona' },
      { name: '2 xona' },
      { name: '1 xona' },
    ])).toEqual(['1 xona', '2 xona', '10 xona']);
  });

  it('keeps the existing group room selectable while editing legacy data', () => {
    expect(buildRoomNumberOptions([{ name: '1 xona' }], 'Old room')).toEqual(['1 xona', 'Old room']);
  });
});
