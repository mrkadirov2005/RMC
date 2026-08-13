import { describe, expect, it } from 'vitest';
import { ADMIN_PAGE_ACCESS } from '../adminPageAccess';
import { ROUTE_PERMISSIONS } from '../permissions';

describe('branch admin page access catalog', () => {
  it('matches the current non-owner admin sidebar pages', () => {
    expect(ADMIN_PAGE_ACCESS.map((page) => page.label)).toEqual([
      'Dashboard', 'Students', 'Telegram Leads', 'Archive', 'Retention', 'Teachers', 'Classes',
      'Rooms', 'Calendar', 'Tests', 'Payments', 'Assignments', 'Subjects', 'Debts',
    ]);
  });

  it('uses the same permission for the admin dialog and route guard', () => {
    for (const page of ADMIN_PAGE_ACCESS) expect(ROUTE_PERMISSIONS[page.path as keyof typeof ROUTE_PERMISSIONS]).toBe(page.permission);
  });
});
