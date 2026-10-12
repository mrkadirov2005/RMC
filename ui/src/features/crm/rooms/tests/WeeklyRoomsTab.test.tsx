import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WeeklyRoomsTab } from '../components/WeeklyRoomsTab';

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (value: string, vars?: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`)),
  }),
}));
const week = (day: string, lessons: unknown[], free: unknown[]) =>
  ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((name) => (name === day ? { day: name, lessons, free } : { day: name, lessons: [], free: [{ start: '08:00', end: '21:00' }] }));
vi.mock('../api', () => ({
  roomAPI: {
    getWeekly: vi.fn(async () => ({ data: {
      summary: { rooms: 1, free_seats_per_week: 0, over_capacity_groups: 1, rooms_without_capacity: 0 },
      rooms: [{
        room_id: 1, name: '101', capacity: 10, opens: '08:00', closes: '21:00', lessons_per_week: 1, free_seats_per_week: 0, free_hours_per_week: 89.5,
        over_capacity: [{ class_name: 'B1 guruh', students: 12, capacity: 10 }],
        days: week('tuesday', [{ start: '14:00', end: '15:30', class_name: 'B1 guruh', students: 12, free_seats: -2 }], [{ start: '08:00', end: '14:00' }, { start: '15:30', end: '21:00' }]),
      }],
    } })),
  },
}));

describe('free rooms this week', () => {
  it('warns about groups larger than their room and shows free windows per day', async () => {
    render(<WeeklyRoomsTab />);
    expect(await screen.findByText('B1 guruh in room 101: 12 students, 10 seats')).toBeTruthy();
    expect(screen.getByText('89.5')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Tuesday' }));
    expect(screen.getByText('08:00–14:00, 15:30–21:00')).toBeTruthy();
    expect(screen.getByText('14:00–15:30 B1 guruh (12/10)')).toBeTruthy();
  });
});
