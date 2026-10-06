import { PERMISSION_CODES } from '@/types';

export interface AdminSubPageAccess {
  label: string;
  /** The query value the page reads to pick this submenu, e.g. /salary?view=monthly or /owner/reports?section=finance. */
  view: string;
  permission: string;
}

export interface AdminPageAccess {
  label: string;
  path: string;
  permission: string;
  children?: readonly AdminSubPageAccess[];
}

// Every sidebar page an owner can grant a branch admin, in sidebar order. The admin dialog lists
// these, and the sidebar and route guards check the same permission codes. Owner Panel is not
// here: it manages admin accounts, so it stays owner-only. Reports is safe to grant because the
// server limits an admin's data to their own branch.
export const ADMIN_PAGE_ACCESS: readonly AdminPageAccess[] = [
  { label: 'Dashboard', path: '/dashboard', permission: PERMISSION_CODES.VIEW_DASHBOARD },
  { label: 'Students', path: '/students', permission: PERMISSION_CODES.CRUD_STUDENT },
  { label: 'Telegram Leads', path: '/telegram-registrations', permission: PERMISSION_CODES.VIEW_TELEGRAM_LEADS },
  { label: 'Archive', path: '/archive', permission: PERMISSION_CODES.VIEW_ARCHIVE },
  {
    label: 'Retention',
    path: '/retention',
    permission: PERMISSION_CODES.VIEW_RETENTION,
    children: [
      { label: 'Retention', view: 'retention', permission: PERMISSION_CODES.RETENTION_TAB_RETENTION },
      { label: 'Intake', view: 'intake', permission: PERMISSION_CODES.RETENTION_TAB_INTAKE },
    ],
  },
  { label: 'Teachers', path: '/teachers', permission: PERMISSION_CODES.CRUD_TEACHER },
  { label: 'Classes', path: '/classes', permission: PERMISSION_CODES.CRUD_CLASS },
  { label: 'Consolidations', path: '/consolidations', permission: PERMISSION_CODES.VIEW_CONSOLIDATIONS },
  { label: 'Rooms', path: '/rooms', permission: PERMISSION_CODES.CRUD_ROOM },
  { label: 'Calendar', path: '/calendar', permission: PERMISSION_CODES.VIEW_CALENDAR },
  { label: 'Tests', path: '/tests', permission: PERMISSION_CODES.MANAGE_TESTS },
  { label: 'Payments', path: '/payments', permission: PERMISSION_CODES.CRUD_PAYMENT },
  {
    label: 'Salary',
    path: '/salary',
    permission: PERMISSION_CODES.MANAGE_SALARY,
    children: [
      { label: 'Total', view: 'total', permission: PERMISSION_CODES.SALARY_TAB_TOTAL },
      { label: 'Monthly', view: 'monthly', permission: PERMISSION_CODES.SALARY_TAB_MONTHLY },
      { label: 'List', view: 'list', permission: PERMISSION_CODES.SALARY_TAB_LIST },
    ],
  },
  { label: 'Assignments', path: '/assignments', permission: PERMISSION_CODES.CRUD_ASSIGNMENT },
  { label: 'Teacher Tasks', path: '/teacher-tasks', permission: PERMISSION_CODES.CRUD_TEACHER_TASK },
  { label: 'Subjects', path: '/subjects', permission: PERMISSION_CODES.CRUD_SUBJECT },
  { label: 'Debts', path: '/debts', permission: PERMISSION_CODES.CRUD_DEBT },
  {
    label: 'Reports',
    path: '/owner/reports',
    permission: PERMISSION_CODES.VIEW_REPORTS,
    children: [
      { label: 'Moliya', view: 'finance', permission: PERMISSION_CODES.REPORTS_TAB_FINANCE },
      { label: "O'quvchilar", view: 'students', permission: PERMISSION_CODES.REPORTS_TAB_STUDENTS },
      { label: "O'qituvchilar", view: 'teachers', permission: PERMISSION_CODES.REPORTS_TAB_TEACHERS },
      { label: 'Chegirmalar', view: 'discounts', permission: PERMISSION_CODES.REPORTS_TAB_DISCOUNTS },
      { label: 'Retention', view: 'retention', permission: PERMISSION_CODES.REPORTS_TAB_RETENTION },
      { label: 'Davomat', view: 'attendance', permission: PERMISSION_CODES.REPORTS_TAB_ATTENDANCE },
      { label: 'Class Reports', view: 'classes', permission: PERMISSION_CODES.REPORTS_TAB_CLASSES },
    ],
  },
  // An admin only ever sees and edits their own branch here; creating or deleting branches
  // stays owner-only on the server.
  { label: 'Centers', path: '/centers', permission: PERMISSION_CODES.CRUD_CENTER },
];

const pageWithChildren = (parentPermission: string) =>
  ADMIN_PAGE_ACCESS.find((page) => page.permission === parentPermission && page.children?.length);

/**
 * Whether an admin with these permissions may open a submenu of a page. Without the page itself,
 * never. With the page but no submenu codes at all (saved before submenus could be chosen), every
 * submenu, so existing admins keep what they had.
 */
export const canAccessSubPage = (permissions: readonly string[], parentPermission: string, childPermission: string) => {
  if (!permissions.includes(parentPermission)) return false;
  const page = pageWithChildren(parentPermission);
  if (!page) return true;
  const childCodes = page.children!.map((child) => child.permission);
  if (!childCodes.some((code) => permissions.includes(code))) return true;
  return permissions.includes(childPermission);
};

/**
 * Permissions as the admin dialog should show them: a page saved without submenu codes shows all
 * of its submenus ticked, which is what that admin can actually see.
 */
export const expandLegacySubPagePermissions = (permissions: readonly string[]) => {
  const expanded = new Set(permissions);
  ADMIN_PAGE_ACCESS.forEach((page) => {
    if (!page.children?.length || !expanded.has(page.permission)) return;
    const childCodes = page.children.map((child) => child.permission);
    if (!childCodes.some((code) => expanded.has(code))) childCodes.forEach((code) => expanded.add(code));
  });
  return Array.from(expanded);
};

/**
 * Applies one checkbox in the admin dialog. Ticking a page ticks all its submenus; unticking it
 * clears them. Unticking a page's last submenu unticks the page too, since a page with no
 * submenus left would otherwise read as an old account that may see all of them.
 */
export const togglePagePermission = (permissions: readonly string[], code: string, enabled: boolean) => {
  const next = new Set(permissions);
  const page = ADMIN_PAGE_ACCESS.find((item) => item.permission === code);
  const parent = ADMIN_PAGE_ACCESS.find((item) => item.children?.some((child) => child.permission === code));

  if (page) {
    const codes = [page.permission, ...(page.children || []).map((child) => child.permission)];
    codes.forEach((value) => (enabled ? next.add(value) : next.delete(value)));
  } else if (parent) {
    if (enabled) {
      next.add(code);
      next.add(parent.permission);
    } else {
      next.delete(code);
      if (!parent.children!.some((child) => next.has(child.permission))) next.delete(parent.permission);
    }
  } else if (enabled) {
    next.add(code);
  } else {
    next.delete(code);
  }
  return Array.from(next);
};

/**
 * The submenu view a page should show: the requested one if allowed, else the first allowed one
 * (else the first), so a hidden submenu can't be reached by typing its URL.
 */
export const resolveSubPageView = (
  parentPermission: string,
  requestedView: string | null,
  isAllowed: (parentPermission: string, childPermission: string) => boolean
) => {
  const children = pageWithChildren(parentPermission)?.children || [];
  const allowed = children.filter((child) => isAllowed(parentPermission, child.permission));
  return (allowed.find((child) => child.view === requestedView) || allowed[0] || children[0])?.view ?? requestedView ?? '';
};
