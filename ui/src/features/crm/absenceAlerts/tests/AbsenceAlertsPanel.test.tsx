import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AbsenceAlertsPanel } from '../AbsenceAlertsPanel';

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (value: string, vars?: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`)),
  }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('@/utils/toast', () => ({ showToast: toast }));

const getAll = vi.fn();
const resolve = vi.fn();
const sendAttendance = vi.fn();
const getAttendanceSent = vi.fn();
vi.mock('../api', () => ({
  absenceAlertAPI: { getAll: () => getAll(), resolve: (body: unknown) => resolve(body) },
  smsAPI: { sendAttendance: (items: unknown) => sendAttendance(items), getAttendanceSent: () => getAttendanceSent() },
}));

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
    sendAttendance.mockReset();
    getAttendanceSent.mockReset();
    toast.success.mockReset();
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

  it('lets a teacher text the parents, once per run of absences', async () => {
    const texted = { ...alert, student_id: 11, student_name: 'Karimov Bek' };
    getAll.mockResolvedValue({ data: [alert, texted] });
    getAttendanceSent
      .mockResolvedValueOnce({ data: [{ key: '1:11:2026-10-06', sent_at: '2026-10-07T05:00:00Z' }] })
      .mockResolvedValue({ data: [{ key: '1:11:2026-10-06' }, { key: '1:10:2026-10-06' }] });
    sendAttendance.mockResolvedValue({ data: { queued: 1, already_sent: 0, no_phone: 0, not_applicable: 0, daily_limit: 30, sent_today: 0, waiting: 1, sending_now: true } });
    render(<AbsenceAlertsPanel canSendSms />);

    expect(await screen.findByText('Isomova Ziyoda')).toBeTruthy();
    // Bek's parents were already texted about these absences.
    expect(screen.getAllByText('SMS sent')).toHaveLength(1);
    expect(screen.getByText('SMS to all parents (1)')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'SMS to parents' }));
    await waitFor(() => expect(sendAttendance).toHaveBeenCalledWith([{ student_id: 10, class_id: 1 }]));
    expect(toast.success).toHaveBeenCalledWith('1 SMS queued');
    await waitFor(() => expect(screen.getAllByText('SMS sent')).toHaveLength(2));
  });

  it('offers no SMS where it is not allowed', async () => {
    getAll.mockResolvedValue({ data: [alert] });
    render(<AbsenceAlertsPanel canResolve />);
    await screen.findByText('Isomova Ziyoda');
    expect(screen.queryByText('SMS to parents')).toBeNull();
    expect(getAttendanceSent).not.toHaveBeenCalled();
  });
});
