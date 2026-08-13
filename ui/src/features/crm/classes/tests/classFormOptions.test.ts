import { describe, expect, it } from 'vitest';
import { buildRoomNumberOptions } from '../classFormOptions';

describe('class form room options', () => {
  it('deduplicates rooms and sorts room numbers naturally', () => {
    expect(buildRoomNumberOptions([
      { room_number: '10 xona' },
      { room_number: '2 xona' },
      { room_number: '2 xona' },
      { room_number: '1 xona' },
    ])).toEqual(['1 xona', '2 xona', '10 xona']);
  });

  it('keeps the existing group room selectable while editing legacy data', () => {
    expect(buildRoomNumberOptions([{ room_number: '1 xona' }], 'Old room')).toEqual(['1 xona', 'Old room']);
  });
});
