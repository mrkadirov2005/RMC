import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SmsTemplatesPanel from '../SmsTemplatesPanel';

const i18n = vi.hoisted(() => ({
  t: (value: string, vars?: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`)),
}));
vi.mock('@/i18n/LanguageContext', () => ({ useLanguage: () => i18n }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('@/utils/toast', () => ({ showToast: toast }));
const sms = vi.hoisted(() => ({
  getTemplates: vi.fn(),
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  setTemplateActive: vi.fn(),
}));
vi.mock('../api', () => ({ smsAPI: sms }));

const kinds = [
  { kind: 'payment_success', placeholders: ['ism', 'guruh', 'markaz', 'oy', 'tolangan', 'qoldiq', 'kutilgan'], example: 'Rahmat {ism}' },
  { kind: 'payment_waiting', placeholders: ['ism', 'guruh', 'markaz', 'oy', 'tolangan', 'qoldiq', 'kutilgan'], example: "Kutilmoqda: {qoldiq}" },
  { kind: 'attendance', placeholders: ['ism', 'guruh', 'markaz', 'soni', 'sanalar'], example: '{ism} kelmadi' },
];
const template = (overrides = {}) => ({ template_id: 1, kind: 'payment_waiting', name: 'Yumshoq', body: 'Salom, {ism}: {qoldiq}', is_active: true, updated_at: null, ...overrides });

describe('SMS templates panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sms.getTemplates.mockResolvedValue({ data: { templates: [template(), template({ template_id: 2, name: 'Qattiq', is_active: false })], kinds } });
    sms.createTemplate.mockResolvedValue({ data: {} });
    sms.setTemplateActive.mockResolvedValue({ data: {} });
    sms.deleteTemplate.mockResolvedValue({ data: {} });
  });

  it('shows each type with the template in use, or the standard text', async () => {
    render(<SmsTemplatesPanel />);
    expect(await screen.findByText('In use: Yumshoq')).toBeTruthy();
    expect(screen.getAllByText('In use: the standard text')).toHaveLength(2);
    expect(screen.getByText('Qattiq')).toBeTruthy();
  });

  it('creates a template from the example, with placeholders and a live preview', async () => {
    render(<SmsTemplatesPanel />);
    await screen.findByText('In use: Yumshoq');
    const attendance = screen.getByRole('heading', { name: 'Missed lessons' }).closest('section') as HTMLElement;
    fireEvent.click(within(attendance).getByRole('button', { name: /New template/ }));

    await screen.findByLabelText('Template name');
    const dialog = document.body;
    const body = within(dialog).getByLabelText('Text') as HTMLTextAreaElement;
    expect(body.value).toBe('{ism} kelmadi');
    expect(within(dialog).queryByRole('button', { name: /\{qoldiq\}/ })).toBeNull();
    fireEvent.change(within(dialog).getByLabelText('Template name'), { target: { value: 'Davomat' } });
    fireEvent.change(body, { target: { value: 'Salom! ' } });
    body.setSelectionRange(7, 7);
    fireEvent.click(within(dialog).getByRole('button', { name: /\{soni\}/ }));
    expect(body.value).toBe('Salom! {soni}');
    expect(within(dialog).getByText('Salom! 2')).toBeTruthy();
    expect(within(dialog).getByText('8 characters · 1 SMS per parent')).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(sms.createTemplate).toHaveBeenCalledWith({ kind: 'attendance', name: 'Davomat', body: 'Salom! {soni}' }));
    expect(toast.success).toHaveBeenCalledWith('Template saved');
  });

  it('switches a template on and off, and deletes after asking', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<SmsTemplatesPanel />);
    await screen.findByText('Qattiq');
    const switches = screen.getAllByRole('switch', { name: 'Use this template' });
    fireEvent.click(switches[1]);
    await waitFor(() => expect(sms.setTemplateActive).toHaveBeenCalledWith(2, true));
    fireEvent.click(switches[0]);
    await waitFor(() => expect(sms.setTemplateActive).toHaveBeenCalledWith(1, false));

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[1]);
    await waitFor(() => expect(sms.deleteTemplate).toHaveBeenCalledWith(2));
  });

  it('shows the reason when saving is refused', async () => {
    sms.createTemplate.mockImplementation(() => Promise.reject(Object.assign(new Error('400'), { response: { data: { error: "Bu turda ishlatib bo'lmaydigan o'rinlar: {summa}." } } })));
    render(<SmsTemplatesPanel />);
    await screen.findByText('In use: Yumshoq');
    fireEvent.click(screen.getAllByRole('button', { name: /New template/ })[0]);
    await screen.findByLabelText('Template name');
    const dialog = document.body;
    fireEvent.change(within(dialog).getByLabelText('Template name'), { target: { value: 'X' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    // The editor stays open so the text can be fixed.
    expect(screen.getByLabelText('Template name')).toBeTruthy();
  });
});
