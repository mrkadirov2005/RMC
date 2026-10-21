import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OwnerSmsPage from '../OwnerSmsPage';

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (value: string, vars?: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`)),
  }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('@/utils/toast', () => ({ showToast: toast }));

const sms = vi.hoisted(() => ({ getStatus: vi.fn(), getMessages: vi.fn(), sendTest: vi.fn() }));
const centers = vi.hoisted(() => ({ getAll: vi.fn() }));
vi.mock('../api', () => ({ smsAPI: sms, ownerManagerApi: { centers } }));
const auth = vi.hoisted(() => ({ user: { role: 'owner', permissions: [] as string[] } }));
vi.mock('@/features/crm/hooks', () => ({ useAppSelector: (select: (state: unknown) => unknown) => select({ auth }) }));
vi.mock('@/features/crm/hooks/useRBAC', () => ({
  useRBAC: () => ({
    canAccessSubPage: (_page: string, tab: string) =>
      auth.user.role === 'owner' || !auth.user.permissions.some((code) => code.startsWith('SMS_TAB_')) || auth.user.permissions.includes(tab),
  }),
}));
vi.mock('../SmsTemplatesPanel', () => ({ default: () => <div>templates panel</div> }));

const message = (overrides = {}) => ({
  sms_id: 1, kind: 'payment_waiting', phone: '+998901234567', status: 'delivered', error: null,
  text: "Hurmatli ota-ona! Ali Valiyev (IELTS) uchun oktyabr oyi to'lovi kutilmoqda: 300 000 so'm.",
  created_at: '2026-10-13T05:00:00Z', sent_at: '2026-10-13T05:00:30Z', center_name: 'Temurbek', class_name: 'IELTS',
  student_name: 'Valiyev Ali', created_by_type: 'superuser', sender_name: 'Admin Aka', ...overrides,
});

const renderPage = (path = '/owner/sms') => render(<MemoryRouter initialEntries={[path]}><OwnerSmsPage /></MemoryRouter>);

describe('owner SMS page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sms.getStatus.mockResolvedValue({ data: { configured: true, daily_limit: 30, sent_today: 12, queued: 2, send_from_hour: 8, send_to_hour: 21 } });
    centers.getAll.mockResolvedValue({ data: [{ center_id: 1, center_name: 'Temurbek' }, { center_id: 2, center_name: 'Chilonzor' }] });
    sms.getMessages.mockResolvedValue({ data: { page: 1, limit: 50, total: 2, by_status: { delivered: 1, failed: 1 }, rows: [
      message(),
      message({ sms_id: 2, kind: 'attendance', status: 'failed', error: 'RESULT_ERROR_NO_SERVICE', student_name: 'Karimov Bek', created_by_type: 'teacher', sender_name: 'Ibrohim M', text: 'Farzandingiz darsga kelmadi.' }),
    ] } });
  });

  it('shows the phone, today against the limit, and every message', async () => {
    renderPage();
    expect(await screen.findByText('Valiyev Ali')).toBeTruthy();
    expect(screen.getByText('Connected')).toBeTruthy();
    expect(screen.getByText('12 / 30')).toBeTruthy();
    expect(screen.getByText('Karimov Bek')).toBeTruthy();
    expect(screen.getByText('Missed lessons')).toBeTruthy();
    expect(screen.getByText('RESULT_ERROR_NO_SERVICE')).toBeTruthy();
    expect(screen.getByText('Ibrohim M')).toBeTruthy();
    expect(screen.getByText('Failed: 1')).toBeTruthy();
    expect(sms.getMessages).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
  });

  it('filters by date and search', async () => {
    renderPage();
    await screen.findByText('Valiyev Ali');
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-01' } });
    await waitFor(() => expect(sms.getMessages).toHaveBeenLastCalledWith(expect.objectContaining({ from: '2026-10-01', page: 1 })));
    fireEvent.change(screen.getByLabelText('Search by student, phone or sender'), { target: { value: 'Ali' } });
    await waitFor(() => expect(sms.getMessages).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'Ali', from: '2026-10-01' })));
  });

  it('sends a test SMS', async () => {
    sms.sendTest.mockResolvedValue({ data: { queued: 1, sending_now: true } });
    renderPage();
    fireEvent.change(await screen.findByLabelText('Send a test SMS'), { target: { value: '90 123 45 67' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(sms.sendTest).toHaveBeenCalledWith('90 123 45 67'));
    expect(toast.success).toHaveBeenCalledWith('Test SMS queued; it should arrive within a minute.');
  });

  it('says when the phone is not connected', async () => {
    sms.getStatus.mockResolvedValue({ data: { configured: false, daily_limit: 30, sent_today: 0, queued: 0, send_from_hour: 8, send_to_hour: 21 } });
    renderPage();
    expect(await screen.findByText('The SMS phone is not connected yet, so no SMS are sent.')).toBeTruthy();
    expect(screen.queryByLabelText('Send a test SMS')).toBeNull();
  });

  it('opens the Templates tab from the address and switches back to messages', async () => {
    renderPage('/owner/sms?tab=templates');
    expect(await screen.findByText('templates panel')).toBeTruthy();
    expect(screen.queryByText('Reset filters')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Messages' }));
    expect(await screen.findByText('Valiyev Ali')).toBeTruthy();
    expect(screen.queryByText('templates panel')).toBeNull();
  });

  it("gives an admin only the ticked tabs, their own branch's messages and no test SMS", async () => {
    auth.user = { role: 'admin', permissions: ['VIEW_SMS', 'SMS_TAB_MESSAGES'] };
    renderPage('/owner/sms?tab=templates');
    expect(await screen.findByText('Valiyev Ali')).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Templates' })).toBeNull();
    expect(screen.queryByText('templates panel')).toBeNull();
    expect(screen.queryByText('Send a test SMS')).toBeNull();
    expect(centers.getAll).not.toHaveBeenCalled();
    auth.user = { role: 'owner', permissions: [] };
  });
});
