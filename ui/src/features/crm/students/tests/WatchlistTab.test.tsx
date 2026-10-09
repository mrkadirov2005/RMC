import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WatchlistTab } from '../components/WatchlistTab';

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (value: string, vars?: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`)),
  }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/utils/toast', () => ({ showToast: toast }));
const api = vi.hoisted(() => ({
  getAll: vi.fn(),
  watchlist: { getAll: vi.fn(), add: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));
vi.mock('../api/studentsApi', () => ({ studentsApi: api }));

const watched = {
  watch_id: 1, student_id: 5, first_name: 'Alisher', last_name: 'Axmadov', father_name: 'Vali', phone: '+998900000001',
  parent_name: 'Vali Axmadov', parent_phone: '+998900000002', school_name: '12-maktab', school_class: '7', class_name: 'B1', teacher_name: 'Meliqulov Ibrohim',
  contact_name: 'Otasi', contact_phone: '+998900000003', note: null,
  rating: { group_place: 2, group_size: 12, center_place: 40, average_score: 87 },
};

describe('close watch tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.watchlist.getAll.mockResolvedValue({ data: [watched] });
  });

  it('lists watched students with their rating and whom to inform', async () => {
    render(<MemoryRouter><WatchlistTab active /></MemoryRouter>);
    expect(await screen.findByText('Axmadov Alisher')).toBeTruthy();
    expect(screen.getByText('Group: 2/12 · Center: 40 · Average: 87')).toBeTruthy();
    expect(screen.getByText('Otasi')).toBeTruthy();
    expect(screen.getByText('12-maktab, 7')).toBeTruthy();
  });

  it('finds a student by name and adds them with a contact', async () => {
    api.getAll.mockResolvedValue({ data: { data: [{ student_id: 9, first_name: 'Ali', last_name: 'Karimov', class_name: 'A2' }], total: 1 } });
    api.watchlist.add.mockResolvedValue({ data: { watch_id: 2 } });
    render(<MemoryRouter><WatchlistTab active /></MemoryRouter>);
    await screen.findByText('Axmadov Alisher');

    fireEvent.change(screen.getByLabelText('Student'), { target: { value: 'Kari' } });
    fireEvent.click(await screen.findByRole('button', { name: /Karimov Ali/ }, { timeout: 2000 }));
    fireEvent.change(screen.getByLabelText('Whom to inform'), { target: { value: 'Onasi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(api.watchlist.add).toHaveBeenCalledWith({ student_id: 9, contact_name: 'Onasi', contact_phone: '', note: '' }));
    expect(api.getAll).toHaveBeenCalledWith({ q: 'Kari', page: 1, limit: 8 });
    expect(toast.success).toHaveBeenCalledWith('Student added to close watch');
  });
});
