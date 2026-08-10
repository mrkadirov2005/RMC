import { describe, expect, it } from 'vitest';
import { summarizeOwnerAttendance } from '../utils';

describe('summarizeOwnerAttendance', () => {
  it('counts present and late records as present attendance', () => {
    expect(summarizeOwnerAttendance([
      { status: 'Present' },
      { status: 'Late' },
      { status: ' present ' },
    ])).toEqual({ present: 3, absent: 0 });
  });

  it('counts supported absent statuses and ignores unrelated values', () => {
    expect(summarizeOwnerAttendance([
      { status: 'Absent' },
      { status: 'Absent NR' },
      { status: 'Absent R' },
      { status: 'Excused' },
      {},
    ])).toEqual({ present: 0, absent: 3 });
  });
});
