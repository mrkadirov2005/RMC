import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SmsSettings } from '../SmsSettings';

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (value: string, vars?: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`)),
  }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('@/utils/toast', () => ({ showToast: toast }));

const sms = vi.hoisted(() => ({ getStatus: vi.fn(), saveSettings: vi.fn(), getMessages: vi.fn(), sendTest: vi.fn() }));
vi.mock('../api', () => ({ smsAPI: sms }));

const status = (overrides = {}) => ({
  data: {
    configured: true, daily_limit: 30, sent_today: 4, queued: 1, send_from_hour: 8, send_to_hour: 21,
    settings: { absence: true, payment_reminder: true, teacher_feedback: false },
    ...overrides,
  },
});

describe('SMS settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sms.getMessages.mockResolvedValue({ data: [
      { sms_id: 1, kind: 'absence', phone: '+998901234567', text: 'Hurmatli ota-ona! Farzandingiz Ali darsiga kelmadi.', status: 'delivered', created_at: '2026-10-13T05:00:00Z', student_name: 'Valiyev Ali' },
    ] });
  });

  it('shows the phone, the day count and the latest messages, and saves a switch', async () => {
    sms.getStatus.mockResolvedValue(status());
    sms.saveSettings.mockResolvedValue({ data: { absence: false, payment_reminder: true, teacher_feedback: false } });
    render(<SmsSettings />);

    expect(await screen.findByText('Phone connected')).toBeTruthy();
    expect(screen.getByText('Sent today: 4 / 30')).toBeTruthy();
    expect(await screen.findByText('Valiyev Ali')).toBeTruthy();
    expect(screen.getByText('Delivered')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Missed a lesson'));
    await waitFor(() => expect(sms.saveSettings).toHaveBeenCalledWith({ absence: false, payment_reminder: true, teacher_feedback: false }));
  });

  it('sends a test SMS to the number typed in', async () => {
    sms.getStatus.mockResolvedValue(status());
    sms.sendTest.mockResolvedValue({ data: { queued: 1, sending_now: true } });
    render(<SmsSettings />);
    fireEvent.change(await screen.findByLabelText('Send a test SMS'), { target: { value: ' 90 123 45 67 ' } });
    fireEvent.click(screen.getByRole('button', { name: /Send/ }));
    await waitFor(() => expect(sms.sendTest).toHaveBeenCalledWith('90 123 45 67'));
    expect(toast.success).toHaveBeenCalledWith('Test SMS queued; it should arrive within a minute.');
  });

  it('says when no phone is connected and offers no test', async () => {
    sms.getStatus.mockResolvedValue(status({ configured: false }));
    render(<SmsSettings />);
    expect(await screen.findByText('The SMS phone is not connected yet, so no SMS are sent.')).toBeTruthy();
    expect(screen.queryByLabelText('Send a test SMS')).toBeNull();
  });

  it('stays hidden for someone who cannot see it', async () => {
    sms.getStatus.mockRejectedValue(new Error('403'));
    const { container } = render(<SmsSettings />);
    await waitFor(() => expect(sms.getStatus).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });
});
