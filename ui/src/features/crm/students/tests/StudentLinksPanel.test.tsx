import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentLinksPanel } from '../components/StudentLinksPanel';

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (value: string, vars?: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`)),
  }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/utils/toast', () => ({ showToast: toast }));
const api = vi.hoisted(() => ({ getAll: vi.fn(), links: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() } }));
vi.mock('../api/studentsApi', () => ({ studentsApi: api }));

describe('relatives and friends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.links.getAll.mockResolvedValue({ data: [{ link_id: 1, relation_type: 'siblings', note: 'aka-uka', members: [
      { student_id: 1, first_name: 'Temurbek', last_name: 'Shahobov', class_name: 'B1', teacher_name: 'Meliqulov Ibrohim', parent_phone: '+998900000001' },
      { student_id: 2, first_name: 'Javhar', last_name: 'Shahobov', class_name: 'A2' },
    ] }] });
  });

  it('shows each group with its relation and members', async () => {
    render(<StudentLinksPanel active />);
    const group = await screen.findByTestId('student-link-group');
    expect(within(group).getByText('Siblings')).toBeTruthy();
    expect(within(group).getByText('Shahobov Temurbek')).toBeTruthy();
    expect(within(group).getByText('B1 · Meliqulov Ibrohim')).toBeTruthy();
  });

  it('needs two students, then links them', async () => {
    api.getAll.mockImplementation(async ({ q }: { q: string }) => ({ data: { data: q.startsWith('Zik')
      ? [{ student_id: 3, first_name: 'Zikrillo', last_name: 'X' }]
      : [{ student_id: 4, first_name: 'Sherbek', last_name: 'Y' }] } }));
    api.links.create.mockResolvedValue({ data: { link_id: 2 } });
    render(<StudentLinksPanel active />);
    await screen.findByTestId('student-link-group');

    fireEvent.click(screen.getByRole('button', { name: 'Link students' }));
    expect(toast.error).toHaveBeenCalledWith('Choose at least two students.');

    for (const [typed, found] of [['Zik', /X Zikrillo/], ['She', /Y Sherbek/]] as const) {
      fireEvent.change(screen.getByLabelText('Add a student'), { target: { value: typed } });
      fireEvent.click(await screen.findByRole('button', { name: found }, { timeout: 2000 }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Link students' }));
    await waitFor(() => expect(api.links.create).toHaveBeenCalledWith({ relation_type: 'siblings', student_ids: [3, 4], note: '' }));
  });
});
