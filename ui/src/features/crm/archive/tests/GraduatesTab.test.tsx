import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GraduatesTab } from '../GraduatesTab';

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (value: string, vars?: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`)),
  }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/utils/toast', () => ({ showToast: toast }));
const api = vi.hoisted(() => ({ getGraduates: vi.fn(), uploadCertificate: vi.fn(), downloadCertificate: vi.fn(), deleteCertificate: vi.fn() }));
vi.mock('../api', () => ({ archiveAPI: api }));

const graduate = {
  student_id: 1, first_name: 'Hojiakbar', last_name: 'Abduqodirov', father_name: 'Ali', passport_number: 'AA1234567',
  date_of_birth: '2008-03-14', school_name: '12-maktab', school_class: '11', result: 'IELTS 6.5 oldi',
  studied_from: '2025-09-15', finished_on: '2026-06-20', months_studied: 9, subjects: 'English, IELTS', groups: 'B1 guruh, IELTS guruh',
  teachers: 'Meliqulov Ibrohim', certificates: [{ certificate_id: 5, title: 'IELTS 6.5', file_name: 'ielts.pdf', file_size: 1000 }],
};

describe('graduates tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getGraduates.mockResolvedValue({ data: [graduate] });
  });

  it('shows what the city administration asks for', async () => {
    render(<GraduatesTab />);
    expect(await screen.findByText('Abduqodirov Hojiakbar')).toBeTruthy();
    expect(screen.getByText('AA1234567')).toBeTruthy();
    expect(screen.getByText('14.03.2008')).toBeTruthy();
    expect(screen.getByText('15.09.2025 – 20.06.2026')).toBeTruthy();
    expect(screen.getByText('9 months')).toBeTruthy();
    expect(screen.getByText('IELTS 6.5 oldi')).toBeTruthy();
    expect(screen.getByRole('button', { name: /IELTS 6\.5$/ })).toBeTruthy();
  });

  it('accepts only PDF files', async () => {
    render(<GraduatesTab />);
    fireEvent.click(await screen.findByRole('button', { name: /Add certificate/ }));
    fireEvent.change(screen.getByLabelText('Certificate name'), { target: { value: 'CEFR B2' } });
    fireEvent.change(screen.getByLabelText('PDF file'), { target: { files: [new File(['x'], 'photo.png', { type: 'image/png' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
    expect(toast.error).toHaveBeenCalledWith('Only a PDF file up to 5 MB can be uploaded.');

    fireEvent.change(screen.getByLabelText('PDF file'), { target: { files: [new File(['%PDF-1.4'], 'b2.pdf', { type: 'application/pdf' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
    await waitFor(() => expect(api.uploadCertificate).toHaveBeenCalledWith(1, expect.objectContaining({ title: 'CEFR B2', file_name: 'b2.pdf', data: expect.stringMatching(/^data:application\/pdf;base64,/) })));
  });
});
