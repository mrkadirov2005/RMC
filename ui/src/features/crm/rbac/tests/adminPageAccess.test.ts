import { describe, expect, it } from 'vitest';
import {
  ADMIN_PAGE_ACCESS,
  canAccessSubPage,
  expandLegacySubPagePermissions,
  resolveSubPageView,
  togglePagePermission,
} from '../adminPageAccess';
import { ROUTE_PERMISSIONS } from '../permissions';

describe('branch admin page access catalog', () => {
  it('lists every sidebar page an admin can be given, in sidebar order', () => {
    expect(ADMIN_PAGE_ACCESS.map((page) => page.label)).toEqual([
      'Dashboard', 'Students', 'Telegram Leads', 'Archive', 'Retention', 'Teachers', 'Classes', 'Consolidations',
      'Rooms', 'Calendar', 'Tests', 'Payments', 'Salary', 'Assignments', 'Teacher Tasks', 'Subjects', 'Debts', 'Centers',
    ]);
    expect(ADMIN_PAGE_ACCESS.find((page) => page.label === 'Salary')?.children?.map((child) => child.label)).toEqual(['Total', 'Monthly', 'List']);
    expect(ADMIN_PAGE_ACCESS.find((page) => page.label === 'Retention')?.children?.map((child) => child.label)).toEqual(['Retention', 'Intake']);
  });

  it('uses the same permission for the admin dialog and route guard', () => {
    for (const page of ADMIN_PAGE_ACCESS) expect(ROUTE_PERMISSIONS[page.path as keyof typeof ROUTE_PERMISSIONS]).toBe(page.permission);
  });
});

describe('admin submenu access', () => {
  it('lets an admin saved before submenus existed keep every submenu', () => {
    expect(canAccessSubPage(['MANAGE_SALARY'], 'MANAGE_SALARY', 'SALARY_TAB_LIST')).toBe(true);
    expect(expandLegacySubPagePermissions(['MANAGE_SALARY'])).toEqual(
      expect.arrayContaining(['MANAGE_SALARY', 'SALARY_TAB_TOTAL', 'SALARY_TAB_MONTHLY', 'SALARY_TAB_LIST'])
    );
  });

  it('shows only the chosen submenus once any are chosen, and none without the page', () => {
    const permissions = ['MANAGE_SALARY', 'SALARY_TAB_MONTHLY'];
    expect(canAccessSubPage(permissions, 'MANAGE_SALARY', 'SALARY_TAB_MONTHLY')).toBe(true);
    expect(canAccessSubPage(permissions, 'MANAGE_SALARY', 'SALARY_TAB_TOTAL')).toBe(false);
    expect(canAccessSubPage(['SALARY_TAB_TOTAL'], 'MANAGE_SALARY', 'SALARY_TAB_TOTAL')).toBe(false);
    expect(expandLegacySubPagePermissions(permissions)).toEqual(permissions);
  });

  it('ticks a page with its submenus and unticks the page with its last submenu', () => {
    const all = togglePagePermission([], 'VIEW_RETENTION', true);
    expect(all.sort()).toEqual(['RETENTION_TAB_INTAKE', 'RETENTION_TAB_RETENTION', 'VIEW_RETENTION']);

    const onlyIntake = togglePagePermission(all, 'RETENTION_TAB_RETENTION', false);
    expect(onlyIntake.sort()).toEqual(['RETENTION_TAB_INTAKE', 'VIEW_RETENTION']);
    expect(togglePagePermission(onlyIntake, 'RETENTION_TAB_INTAKE', false)).toEqual([]);

    expect(togglePagePermission(['CRUD_STUDENT'], 'VIEW_CONSOLIDATIONS', true)).toEqual(['CRUD_STUDENT', 'VIEW_CONSOLIDATIONS']);
    expect(togglePagePermission(['CRUD_STUDENT', 'MANAGE_SALARY', 'SALARY_TAB_LIST'], 'MANAGE_SALARY', false)).toEqual(['CRUD_STUDENT']);
  });

  it('opens an allowed view when the requested one is hidden', () => {
    const allow = (parent: string, child: string) => canAccessSubPage(['MANAGE_SALARY', 'SALARY_TAB_LIST'], parent, child);
    expect(resolveSubPageView('MANAGE_SALARY', 'total', allow)).toBe('list');
    expect(resolveSubPageView('MANAGE_SALARY', 'list', allow)).toBe('list');
    expect(resolveSubPageView('MANAGE_SALARY', 'monthly', () => true)).toBe('monthly');
  });
});
