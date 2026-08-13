import { describe, expect, it } from 'vitest';
import { CLASS_DETAIL_DARK_HEADER_TARGETS, CLASS_DETAIL_TAB_THEME_CLASS, CLASS_OVERVIEW_FIELDS, DEFAULT_CLASS_DETAIL_TAB } from '../classDetailOverview';

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

  it('provides dark-mode states for inactive and active group tabs', () => {
    expect(CLASS_DETAIL_TAB_THEME_CLASS).toContain('dark:text-muted-foreground');
    expect(CLASS_DETAIL_TAB_THEME_CLASS).toContain('dark:hover:bg-muted');
    expect(CLASS_DETAIL_TAB_THEME_CLASS).toContain('dark:data-[state=active]:bg-background');
    expect(CLASS_DETAIL_TAB_THEME_CLASS).toContain('dark:data-[state=active]:text-foreground');
  });

  it('marks palette-controlled header surfaces for explicit dark-mode overrides', () => {
    expect(CLASS_DETAIL_DARK_HEADER_TARGETS).toEqual(['data-class-detail-header', 'data-class-detail-schedule']);
  });
});
