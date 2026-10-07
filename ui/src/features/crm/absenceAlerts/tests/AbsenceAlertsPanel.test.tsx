import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AbsenceAlertsPanel } from '../AbsenceAlertsPanel';

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (value: string, vars?: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`)),
  }),
}));
vi.mock('@/utils/toast', () => ({ showToast: { success: vi.fn(), error: vi.fn() } }));

const getAll = vi.fn();
const resolve = vi.fn();
vi.mock('../api', () => ({ absenceAlertAPI: { getAll: () => getAll(), resolve: (body: unknown) => resolve(body) } }));

const alert = {
  student_id: 10,
  class_id: 1,
  streak: 3,
  absent_dates: ['2026-10-06', '2026-10-03', '2026-10-01'],
  last_absent_date: '2026-10-06',
  teacher_reason: 'Kasal',
  student_name: 'Isomova Ziyoda',
  phone: null,
  parent_name: 'Onasi',
  parent_phone: '901234567',
  class_name: 'English A',
  teacher_name: 'Ibrohim M',
};

describe('AbsenceAlertsPanel', () => {
  beforeEach(() => {
    getAll.mockReset();
    resolve.mockReset();
  });

  it('shows nothing when no student is missing lessons', async () => {
    getAll.mockResolvedValue({ data: [] });
    const { container } = render(<AbsenceAlertsPanel canResolve />);
    await waitFor(() => expect(getAll).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });

  it('lets a teacher see the alert but not close it', async () => {
    getAll.mockResolvedValue({ data: [alert] });
    render(<AbsenceAlertsPanel />);
    expect(await screen.findByText('Isomova Ziyoda')).toBeTruthy();
    expect(screen.getByText('3 lessons in a row')).toBeTruthy();
    expect(screen.queryByText('Resolve')).toBeNull();
    expect(screen.queryByText(/901234567/)).toBeNull();
  });

  it('lets an admin close it with an outcome, then reloads', async () => {
    getAll.mockResolvedValueOnce({ data: [alert] }).mockResolvedValueOnce({ data: [] });
    resolve.mockResolvedValue({ data: { frozen: true } });
    render(<AbsenceAlertsPanel canResolve />);

    fireEvent.click(await screen.findByText('Resolve'));
    fireEvent.click(screen.getByLabelText(/Sick \(freeze\)/));
    fireEvent.click(screen.getByText('Close alert'));

    await waitFor(() => expect(resolve).toHaveBeenCalledWith({ student_id: 10, class_id: 1, outcome: 'sick', note: 'Kasal' }));
    await waitFor(() => expect(screen.queryByText('Isomova Ziyoda')).toBeNull());
  });
});
