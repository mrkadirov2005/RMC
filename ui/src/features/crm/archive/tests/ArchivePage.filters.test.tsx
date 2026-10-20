import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (value: string, vars?: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`)),
  }),
}));
vi.mock('../hooks', () => ({ useAppSelector: (selector: any) => selector({ auth: { user: { can_hard_delete: false } } }) }));
vi.mock('../../hooks', () => ({ useAppSelector: (selector: any) => selector({ auth: { user: { can_hard_delete: false } } }) }));
const api = vi.hoisted(() => ({ getAll: vi.fn(), restore: vi.fn(), purge: vi.fn(), getGraduates: vi.fn(async () => ({ data: [] })) }));
vi.mock('../api', () => ({ archiveAPI: api }));

import ArchivePage from '../ArchivePage';

const student = (id: number, first: string, extra: Record<string, unknown> = {}) => ({
  student_id: id, first_name: first, last_name: 'X', enrollment_number: `E${id}`, status: 'Removed', class_id: 3, class_name: 'IELTS 1',
  teacher_id: 7, teacher_first_name: 'Shodiyev', teacher_last_name: 'Odiljon', reason_id: 34, reason_name: 'Boshqa markazga ketdi', deleted_at: '2026-10-10T08:00:00Z', ...extra,
});

describe('archive page search and filters', () => {
  beforeEach(() => {
    api.getAll.mockResolvedValue({ data: {
      students: [
        student(1, 'Gulruh', { phone: '901112233', reason_note: 'Najot Talim' }),
        student(2, 'Bektemur', { reason_id: 35, reason_name: 'Ustoz yoqmagani uchun ketdi', class_id: 4, class_name: 'A1 Movers', teacher_id: 8, teacher_first_name: 'Xursandmurodova', teacher_last_name: 'Shamsiya' }),
        student(3, 'Ali', { deleted_at: '2026-09-28T08:00:00Z' }),
      ],
      teachers: [], classes: [], payments: [], sessions: [],
      counts: { students: 3, teachers: 0, classes: 0, payments: 0, sessions: 0 },
    } });
  });

  const names = () => screen.getAllByRole('row').slice(1).map((row) => within(row).queryAllByRole('cell')[0]?.textContent || '');

  it('shows the reason and note, and searches by name, phone or note', async () => {
    render(<MemoryRouter><ArchivePage /></MemoryRouter>);
    expect(await screen.findByText('Najot Talim')).toBeTruthy();
    expect(screen.getByText('Ustoz yoqmagani uchun ketdi')).toBeTruthy();
    expect(screen.getByText('3 of 3')).toBeTruthy();

    fireEvent.change(screen.getAllByLabelText('Search')[0], { target: { value: 'najot' } });
    await waitFor(() => expect(screen.getByText('1 of 3')).toBeTruthy());
    expect(names()[0]).toContain('Gulruh');

    fireEvent.change(screen.getAllByLabelText('Search')[0], { target: { value: 'nobody' } });
    expect(await screen.findByText('No records match the filters.')).toBeTruthy();

    fireEvent.click(screen.getByText('Clear filters'));
    await waitFor(() => expect(screen.getByText('3 of 3')).toBeTruthy());
  });

  it('filters by archive date', async () => {
    render(<MemoryRouter><ArchivePage /></MemoryRouter>);
    await screen.findByText('Najot Talim');
    fireEvent.change(screen.getAllByLabelText('From date')[0], { target: { value: '2026-10-01' } });
    await waitFor(() => expect(screen.getByText('2 of 3')).toBeTruthy());
    expect(names().some((name) => name.includes('Ali'))).toBe(false);
  });

  it('offers reason, group and teacher filters built from the rows', async () => {
    render(<MemoryRouter><ArchivePage /></MemoryRouter>);
    await screen.findByText('Najot Talim');
    expect(screen.getByRole('combobox', { name: 'Reason' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Group' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Teacher' })).toBeTruthy();
    // Every student is "Removed": a filter with one choice is not shown.
    expect(screen.queryByRole('combobox', { name: 'Status' })).toBeNull();
  });

  it('opens the tab named in the address (after a reload)', async () => {
    render(<MemoryRouter initialEntries={['/archive?tab=graduates']}><ArchivePage /></MemoryRouter>);
    await waitFor(() => expect(api.getGraduates).toHaveBeenCalled());
  });
});
