import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LeadsPanel } from '../LeadsPanel';

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (value: string, vars?: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`)),
  }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/utils/toast', () => ({ showToast: toast }));
const api = vi.hoisted(() => ({ getAll: vi.fn(), create: vi.fn(), update: vi.fn(), close: vi.fn(), dueCount: vi.fn() }));
vi.mock('../api', () => ({ leadAPI: api }));

const lead = { lead_id: 1, stage: 'waiting_group', full_name: 'Ali Valiyev', phone: '+998901234567', subject: 'IELTS', level: 'B1', preferred_time: 'Se-Pa-Sha 16:00', call_back_on: '2026-10-09', call_back_due: true, note: null };

describe('leads waiting for a group', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getAll.mockResolvedValue({ data: [lead] });
  });

  it('marks who to call today', async () => {
    render(<LeadsPanel stage="waiting_group" />);
    expect(await screen.findByText('Ali Valiyev')).toBeTruthy();
    expect(screen.getByText('Call today')).toBeTruthy();
    expect(screen.getByText('IELTS · B1')).toBeTruthy();
    expect(api.getAll).toHaveBeenCalledWith('waiting_group');
  });

  it('adds a person with a call-back day', async () => {
    api.create.mockResolvedValue({ data: {} });
    render(<LeadsPanel stage="waiting_group" />);
    await screen.findByText('Ali Valiyev');
    fireEvent.click(screen.getByRole('button', { name: /Add person/ }));
    fireEvent.change(screen.getByLabelText('Full name *'), { target: { value: 'Bek' } });
    fireEvent.change(screen.getByLabelText('Phone *'), { target: { value: '+998900000000' } });
    fireEvent.change(screen.getByLabelText('Call back on'), { target: { value: '2026-10-12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ stage: 'waiting_group', full_name: 'Bek', call_back_on: '2026-10-12' })));
  });

  it('moves a person to the new group list and closes as joined with a note', async () => {
    api.update.mockResolvedValue({ data: {} });
    api.close.mockResolvedValue({ data: {} });
    vi.spyOn(window, 'prompt').mockReturnValue('B1 guruh');
    render(<LeadsPanel stage="waiting_group" />);
    await screen.findByText('Ali Valiyev');
    fireEvent.click(screen.getByRole('button', { name: 'To new group list' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith(1, expect.objectContaining({ stage: 'new_group' })));
    fireEvent.click(screen.getByRole('button', { name: 'Joined a group' }));
    await waitFor(() => expect(api.close).toHaveBeenCalledWith(1, 'enrolled', 'B1 guruh'));
  });
});
