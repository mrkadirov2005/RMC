export const DEFAULT_CLASS_DETAIL_TAB = 'overview';

export const CLASS_DETAIL_TAB_THEME_CLASS = 'dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground dark:data-[state=active]:bg-background dark:data-[state=active]:text-foreground dark:data-[state=active]:shadow-sm';

export const CLASS_DETAIL_DARK_HEADER_TARGETS = ['data-class-detail-header', 'data-class-detail-schedule'] as const;

export const CLASS_OVERVIEW_FIELDS = [
  'Teacher',
  'Lesson days',
  'Lesson time',
  'Students',
  'Capacity',
  'Room',
  'Subjects',
  'Tuition',
  'Level',
  'Group code',
] as const;
