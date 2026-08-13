import { describe, expect, it } from 'vitest';
import { CLASS_OVERVIEW_FIELDS, DEFAULT_CLASS_DETAIL_TAB } from '../classDetailOverview';

describe('class detail overview', () => {
  it('opens the overview before the other group tabs', () => {
    expect(DEFAULT_CLASS_DETAIL_TAB).toBe('overview');
  });

  it('keeps the essential group information in a predictable order', () => {
    expect(CLASS_OVERVIEW_FIELDS).toEqual([
      'Teacher', 'Lesson days', 'Lesson time', 'Students', 'Capacity',
      'Room', 'Subjects', 'Tuition', 'Level', 'Group code',
    ]);
  });
});
