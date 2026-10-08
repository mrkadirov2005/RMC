import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TelegramInboxPanel } from '../TelegramInboxPanel';
import { TelegramFeedbackDialog } from '../TelegramFeedbackDialog';

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (value: string, vars?: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`)),
  }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('@/utils/toast', () => ({ showToast: toast }));

const api = vi.hoisted(() => ({ getInbox: vi.fn(), markInboxRead: vi.fn(), sendFeedback: vi.fn() }));
vi.mock('../api', () => ({ telegramBotAPI: api }));

describe('Telegram inbox', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists complaints and teacher messages and marks one read', async () => {
    api.getInbox.mockResolvedValue({ data: [
      { inbox_id: 1, kind: 'complaint', text: 'Dars vaqti noqulay', is_read: false, created_at: '2026-10-08T10:00:00Z', sender_role: 'parent', sender_name: 'Onasi', student_name: 'Valiyev Ali', teacher_name: null },
      { inbox_id: 2, kind: 'to_teacher', text: 'Rahmat', is_read: true, created_at: '2026-10-08T11:00:00Z', sender_role: 'student', sender_name: 'Ali', student_name: 'Valiyev Ali', teacher_name: 'Ibrohim M' },
    ] });
    api.markInboxRead.mockResolvedValue({});
    render(<TelegramInboxPanel />);

    expect(await screen.findByText('Dars vaqti noqulay')).toBeTruthy();
    expect(screen.getByText('Complaint')).toBeTruthy();
    expect(screen.getByText('1 new')).toBeTruthy();
    fireEvent.click(screen.getByText('Mark read'));
    expect(api.markInboxRead).toHaveBeenCalledWith(1);
    await waitFor(() => expect(screen.queryByText('1 new')).toBeNull());
  });

  it('stays hidden when asked and there is nothing', async () => {
    api.getInbox.mockResolvedValue({ data: [] });
    const { container } = render(<TelegramInboxPanel hideWhenEmpty />);
    await waitFor(() => expect(api.getInbox).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });
});

describe('Telegram feedback', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends the message and says when nobody has joined the bot', async () => {
    api.sendFeedback.mockResolvedValueOnce({ data: { linked: false } }).mockResolvedValueOnce({ data: { queued: 1, linked: true } });
    const onOpenChange = vi.fn();
    render(<TelegramFeedbackDialog studentId={5} studentName="Ali" open onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByLabelText('Message on Telegram'), { target: { value: 'Barakalla!' } });
    fireEvent.click(screen.getByText('Send'));
    await waitFor(() => expect(toast.info).toHaveBeenCalled());
    expect(api.sendFeedback).toHaveBeenCalledWith({ student_id: 5, text: 'Barakalla!' });

    fireEvent.click(screen.getByText('Send'));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
