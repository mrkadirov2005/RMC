import { describe, expect, it } from 'vitest';
import { buildRoomNumberOptions, mergeRoomInventories } from '../classFormOptions';

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

  it('combines the physical inventory with newly created room records', () => {
    expect(mergeRoomInventories(
      [{ name: 'Room 1' }],
      [{ room_number: 'Room 2' }, { room_number: 'Room 3' }],
      'Room 2'
    )).toEqual(['Room 1', 'Room 2', 'Room 3']);
  });
});
