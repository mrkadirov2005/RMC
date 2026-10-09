import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentTrendCard } from '../StudentTrendCard';

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (value: string, vars?: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`)),
  }),
}));
const api = vi.hoisted(() => ({ studentTrend: vi.fn() }));
vi.mock('../../../api', () => ({ reportAPI: api }));

describe('student count trend', () => {
  beforeEach(() => {
    api.studentTrend.mockReset();
    api.studentTrend.mockResolvedValue({ data: [
      { day: '2026-10-10', students: 1100 },
      { day: '2026-10-20', students: 1090 },
      { day: '2026-10-30', students: 1200 },
    ] });
  });

  it("plots the client's example and shows the latest count and change", async () => {
    render(<StudentTrendCard />);
    expect(await screen.findAllByText('1200')).toHaveLength(2);
    expect(screen.getByText('+110 since the previous point')).toBeTruthy();
    expect(screen.getByText('20.10.26')).toBeTruthy();
    expect(api.studentTrend).toHaveBeenCalledWith(12);
  });

  it('reloads for another period', async () => {
    render(<StudentTrendCard />);
    await screen.findAllByText('1200');
    fireEvent.click(screen.getByRole('radio', { name: '6 months' }));
    await waitFor(() => expect(api.studentTrend).toHaveBeenLastCalledWith(6));
  });
});
