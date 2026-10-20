import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// One t for every render, like the real hook (the tab reloads when t changes).
const i18n = vi.hoisted(() => ({
  t: (value: string, vars?: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_: string, key: string) => String(vars?.[key] ?? `{${key}}`)),
}));
vi.mock('@/i18n/LanguageContext', () => ({ useLanguage: () => i18n }));
vi.mock('@/utils/helpers', () => ({ formatMoney: (amount: unknown) => `${Number(amount || 0)} so'm` }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/utils/toast', () => ({ showToast: toast }));
const api = vi.hoisted(() => ({
  getGroups: vi.fn(), assignToGroup: vi.fn(), removeAddedGroup: vi.fn(), classes: vi.fn(), teachers: vi.fn(), activeDiscount: vi.fn(),
}));
vi.mock('../../api', () => ({
  studentAPI: { getGroups: (id: number) => api.getGroups(id), assignToGroup: (...args: unknown[]) => api.assignToGroup(...args), removeAddedGroup: (id: number) => api.removeAddedGroup(id) },
  classAPI: { getAll: () => api.classes() },
  teacherAPI: { getAll: () => api.teachers() },
  discountAPI: { getActiveByStudent: (id: number) => api.activeDiscount(id) },
}));

import { GroupsTab } from '../GroupsTab';

const groups = {
  main_student_id: 9,
  total_coins: 0,
  groups: [
    { student_id: 9, class_id: 3, class_name: 'IELTS 1', status: 'Active', is_main: true, main_student_id: null },
    { student_id: 12, class_id: 4, class_name: 'Math A', status: 'Active', is_main: false, main_student_id: 9, start_date: '2026-10-05', group_note: 'Ikkinchi fan' },
  ],
};

describe('student groups: add to another group', () => {
  beforeEach(() => {
    // Radix select scrolls the chosen option into view; jsdom has no scrolling.
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    vi.clearAllMocks();
    api.getGroups.mockResolvedValue({ data: groups });
    api.classes.mockResolvedValue({ data: [{ class_id: 5, class_name: 'Chess', teacher_id: 7 }] });
    api.teachers.mockResolvedValue({ data: [{ teacher_id: 7, first_name: 'Ali', last_name: 'V' }] });
    api.activeDiscount.mockImplementation(async (id: number) => ({ data: id === 9 ? { discount_id: 31, discount_type: 'fixed', value: 100000, reason: 'Aka-uka' } : null }));
    api.assignToGroup.mockResolvedValue({ data: { copied_discounts: 1 } });
  });

  it('asks for the start date (today by default) and sends the note and the chosen discounts', async () => {
    render(<GroupsTab studentId={9} onOpenStudent={vi.fn()} />);
    expect(await screen.findByText('From 2026-10-05 · Ikkinchi fan')).toBeTruthy();
    fireEvent.click(screen.getByText('Assign to new group'));

    const date = (await screen.findByLabelText('Start date')) as HTMLInputElement;
    expect(date.required).toBe(true);
    expect(date.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    fireEvent.change(date, { target: { value: '2026-10-21' } });
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Ota-onasi so‘radi' } });
    fireEvent.click(await screen.findByLabelText('Copy the discount from IELTS 1'));
    expect(screen.getByText("100000 so'm")).toBeTruthy();

    // Pick teacher, then group (Radix selects open on a keyboard press in jsdom).
    fireEvent.keyDown(screen.getByLabelText('Teacher'), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('option', { name: /Ali V/ }));
    fireEvent.keyDown(screen.getByLabelText('Group'), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('option', { name: 'Chess' }));

    fireEvent.click(screen.getByText('Assign'));
    await waitFor(() => expect(api.assignToGroup).toHaveBeenCalledWith(9, 5, { start_date: '2026-10-21', note: 'Ota-onasi so‘radi', copy_discount_ids: [31] }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Student added to the new group with 1 discount(s)'));
  });

  it('cannot assign without a start date', async () => {
    render(<GroupsTab studentId={9} onOpenStudent={vi.fn()} />);
    await screen.findByText('IELTS 1');
    fireEvent.click(screen.getByText('Assign to new group'));
    fireEvent.change(await screen.findByLabelText('Start date'), { target: { value: '' } });
    expect((screen.getByText('Assign').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('undoes an added group, not the main one', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.removeAddedGroup.mockResolvedValue({ data: { removed: 12 } });
    render(<GroupsTab studentId={9} onOpenStudent={vi.fn()} />);
    const mainRow = (await screen.findByText('IELTS 1')).closest('tr')!;
    expect(within(mainRow).queryByText('Remove from group')).toBeNull();
    const addedRow = screen.getByText('Math A').closest('tr')!;
    fireEvent.click(within(addedRow).getByText('Remove from group'));
    await waitFor(() => expect(api.removeAddedGroup).toHaveBeenCalledWith(12));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Removed from the group'));
    expect(api.getGroups).toHaveBeenCalledTimes(2);
  });

  it('shows why an added group cannot be undone', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.removeAddedGroup.mockRejectedValue({ response: { data: { error: "Bu guruhda dars, to'lov yoki tanga bor. Yozuvni o'chirib bo'lmaydi, arxivlang." } } });
    render(<GroupsTab studentId={9} onOpenStudent={vi.fn()} />);
    fireEvent.click(within((await screen.findByText('Math A')).closest('tr')!).getByText('Remove from group'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('arxivlang')));
  });
});
