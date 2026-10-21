import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomDetailsDialog } from '../components/RoomDetailsDialog';
import { RoomFinderTab } from '../components/RoomFinderTab';
import { RoomsDashboard } from '../components/RoomsDashboard';
import { RoomsListTab } from '../components/RoomsListTab';
import { RoomsTimetableTab } from '../components/RoomsTimetableTab';
import type { PhysicalRoom } from '../hooks/useRoomsOverview';
import type { Weekly, WeeklyRoom, WeekDay } from '../weeklyModel';

const i18n = vi.hoisted(() => ({
  t: (value: string, vars?: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`)),
}));
vi.mock('@/i18n/LanguageContext', () => ({ useLanguage: () => i18n }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('@/utils/toast', () => ({ showToast: toast }));
const api = vi.hoisted(() => ({ getFree: vi.fn(), updatePhysical: vi.fn() }));
vi.mock('../api', () => ({ roomAPI: api }));

const DAYS: WeekDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const lesson = (overrides = {}) => ({ start: '15:00', end: '16:30', class_id: 1, class_name: 'B1 guruh', teacher_id: 7, teacher_name: 'Aziza K', students: 12, free_seats: 3, ...overrides });
const room = (id: number, name: string, days: Partial<Record<WeekDay, ReturnType<typeof lesson>[]>>, overrides = {}): WeeklyRoom => ({
  room_id: id, name, nickname: null, features: [], capacity: 15, opens: '08:00', closes: '18:00', seat_fill_percent: 80, booked_percent: 25,
  days: DAYS.map((day) => ({ day, lessons: days[day] || [], free: [] })),
  lessons_per_week: 0, free_seats_per_week: 0, free_hours_per_week: 0, over_capacity: [], ...overrides,
});
const weekly = (): Weekly => ({
  rooms: [
    room(1, '5', { monday: [lesson()], wednesday: [lesson()], friday: [lesson()] }, { nickname: 'Katta zal', features: ['TV'], seat_fill_percent: 80 }),
    room(2, '10', { tuesday: [lesson({ class_id: 2, class_name: 'A2 guruh', teacher_id: 3, teacher_name: 'Bobur T', students: 18 })] }, { capacity: 15, seat_fill_percent: 120 }),
  ],
  summary: {
    rooms: 2, free_seats_per_week: 3, over_capacity_groups: 1, rooms_without_capacity: 1,
    now: { day: 'monday', time: '15:30' }, in_use_now: 1, free_now: 1, in_use_now_percent: 50, booked_percent: 31, teaching_days: ['monday', 'tuesday', 'wednesday', 'friday'],
  },
});
const physical = (overrides: Partial<PhysicalRoom> = {}): PhysicalRoom => ({
  room_id: 1, name: '5', nickname: 'Katta zal', capacity: 15, status: 'active', features: ['TV', 'Speaker'], operating_start_time: '08:00:00', operating_end_time: '18:00:00', ...overrides,
});

describe('rooms dashboard', () => {
  it('shows total, in use now, free now and the hours booked', () => {
    render(<RoomsDashboard weekly={weekly()} />);
    const dashboard = screen.getByTestId('rooms-dashboard');
    expect(within(dashboard).getByText('Total rooms').parentElement?.textContent).toContain('2');
    expect(within(dashboard).getByText('In use now').parentElement?.textContent).toContain('50% of the rooms');
    expect(within(dashboard).getByText('Free now').parentElement?.textContent).toContain('50% of the rooms');
    expect(within(dashboard).getByText('Hours booked').parentElement?.textContent).toContain('31%');
    expect(within(dashboard).getByText('Now: Monday 15:30')).toBeTruthy();
  });
});

describe('rooms list', () => {
  it('numbers the rooms, writes the extra name in brackets, and shows how full each is', () => {
    const onEdit = vi.fn();
    render(<RoomsListTab rooms={[physical({ room_id: 2, name: '10', nickname: null, features: [] }), physical()]} weekly={weekly()} onAdd={vi.fn()} onEdit={onEdit} />);
    const rows = screen.getAllByRole('row').slice(1);
    // Numeric order: 5 before 10.
    expect(within(rows[0]).getByText('5 (Katta zal)')).toBeTruthy();
    expect(within(rows[0]).getByText('1')).toBeTruthy();
    expect(within(rows[0]).getByText('80% full')).toBeTruthy();
    expect(within(rows[0]).getByText(/20% empty/)).toBeTruthy();
    expect(within(rows[0]).getByText('TV')).toBeTruthy();
    expect(within(rows[1]).getByText('120% full')).toBeTruthy();
    fireEvent.click(within(rows[0]).getByRole('button', { name: 'Edit room 5 (Katta zal)' }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ room_id: 1 }));
  });

  it('still lists a room that is under repair, marked as such', () => {
    render(<RoomsListTab rooms={[physical({ room_id: 9, name: '9', nickname: null, status: 'maintenance' })]} weekly={weekly()} onAdd={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText('Under repair')).toBeTruthy();
    expect(screen.getByText('No lessons')).toBeTruthy();
  });
});

describe('room details', () => {
  beforeEach(() => { vi.clearAllMocks(); api.updatePhysical.mockResolvedValue({ data: {} }); });

  it('saves the extra name, seats, equipment, hours and status', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(<RoomDetailsDialog room={physical()} onClose={onClose} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText('Extra name (in brackets)'), { target: { value: 'Kichik zal' } });
    fireEvent.change(screen.getByLabelText('Room capacity'), { target: { value: '18' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove Speaker' }));
    fireEvent.change(screen.getByLabelText('Equipment'), { target: { value: 'Kondisioner' } });
    fireEvent.keyDown(screen.getByLabelText('Equipment'), { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: '+ Projector' }));
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'maintenance' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.updatePhysical).toHaveBeenCalledWith(1, {
      nickname: 'Kichik zal', capacity: 18, features: ['TV', 'Kondisioner', 'Projector'], operating_start_time: '08:00', operating_end_time: '18:00', status: 'maintenance',
    }));
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps what was typed in the equipment box when Save is pressed, and lets the extra name be cleared', async () => {
    render(<RoomDetailsDialog room={physical()} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Extra name (in brackets)'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Equipment'), { target: { value: 'Doska' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.updatePhysical).toHaveBeenCalledWith(1, expect.objectContaining({ nickname: '', features: ['TV', 'Speaker', 'Doska'] })));
  });

  it('refuses a room that closes before it opens', () => {
    render(<RoomDetailsDialog room={physical()} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Closes'), { target: { value: '07:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(toast.error).toHaveBeenCalledWith('The room must close after it opens');
    expect(api.updatePhysical).not.toHaveBeenCalled();
  });
});

describe('weekly timetable', () => {
  it('shows one grid per day pattern, with free time and a lesson on all three days as one cell', () => {
    render(<RoomsTimetableTab weekly={weekly()} />);
    const mwf = screen.getByTestId('timetable-mwf');
    expect(within(mwf).getByText('5 (Katta zal)')).toBeTruthy();
    // The same group on Mon, Wed and Fri is one cell, without a "some days only" badge.
    expect(within(mwf).getAllByText('B1 guruh')).toHaveLength(1);
    expect(within(mwf).queryByText('Mo We Fr')).toBeNull();
    expect(within(mwf).getAllByText('Free').length).toBeGreaterThan(0);
    const tts = screen.getByTestId('timetable-tts');
    expect(within(tts).getByText('A2 guruh')).toBeTruthy();
    expect(within(tts).getAllByText(/18\/15/).length).toBeGreaterThan(0);
  });

  it('shows only one teacher\'s lessons, with no free cells, and says when a block has none', () => {
    render(<RoomsTimetableTab weekly={weekly()} />);
    fireEvent.change(screen.getByLabelText('Teacher'), { target: { value: '3' } });
    expect(within(screen.getByTestId('timetable-tts')).getByText('A2 guruh')).toBeTruthy();
    expect(within(screen.getByTestId('timetable-mwf')).queryByText('B1 guruh')).toBeNull();
    expect(within(screen.getByTestId('timetable-mwf')).getByText('No lessons for this teacher on these days.')).toBeTruthy();
    expect(within(screen.getByTestId('timetable-tts')).queryByText('Free')).toBeNull();
  });

  it('marks a lesson that meets on only some days of the block', () => {
    const partial = weekly();
    partial.rooms[0] = room(1, '5', { monday: [lesson()], wednesday: [lesson()] });
    render(<RoomsTimetableTab weekly={partial} />);
    expect(within(screen.getByTestId('timetable-mwf')).getByText('Mo We')).toBeTruthy();
  });
});

describe('finding a free room', () => {
  beforeEach(() => vi.clearAllMocks());
  const found = {
    days: ['monday', 'wednesday', 'friday'], start: '15:00', end: '16:30', summary: { free_on_all: 1, free_on_some: 1 },
    rooms: [
      { room_id: 3, name: '3', nickname: 'Oq xona', capacity: 20, features: ['TV'], free_days: ['monday', 'wednesday', 'friday'], busy: [], free_on_all: true },
      { room_id: 1, name: '5', nickname: null, capacity: 15, features: [], free_days: ['monday', 'friday'], free_on_all: false,
        busy: [{ day: 'wednesday', reason: 'lesson', lesson: { start: '15:00', end: '16:30', class_name: 'B1 guruh', teacher_name: 'Aziza K' } }] },
    ],
  };

  it('asks for the chosen days, time and group size, and lists rooms free on all days before the others', async () => {
    api.getFree.mockResolvedValue({ data: found });
    const onAssign = vi.fn();
    render(<RoomFinderTab onAssign={onAssign} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tuesday' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tuesday' }));
    fireEvent.change(screen.getByLabelText('Students in the group'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find rooms' }));
    await waitFor(() => expect(api.getFree).toHaveBeenCalledWith({ days: 'monday,wednesday,friday', start: '15:00', end: '16:30', seats: 12 }));

    const result = await screen.findByTestId('room-finder-result');
    expect(within(result).getByText('Free on all chosen days (1)')).toBeTruthy();
    expect(within(result).getByText('3 (Oq xona)')).toBeTruthy();
    expect(within(result).getByText('Free on some of the days (1)')).toBeTruthy();
    expect(within(result).getByText('Wednesday: B1 guruh 15:00–16:30 (Aziza K)')).toBeTruthy();

    fireEvent.click(within(result).getByRole('button', { name: 'Assign a group' }));
    expect(onAssign).toHaveBeenCalledWith('3', ['monday', 'wednesday', 'friday'], '15:00', '16:30');
    fireEvent.click(within(result).getByRole('button', { name: 'Assign on the free days' }));
    expect(onAssign).toHaveBeenLastCalledWith('5', ['monday', 'friday'], '15:00', '16:30');
  });

  it('will not search without a day or with the end before the start', () => {
    render(<RoomFinderTab onAssign={vi.fn()} />);
    for (const day of ['Monday', 'Wednesday', 'Friday']) fireEvent.click(screen.getByRole('button', { name: day }));
    expect((screen.getByRole('button', { name: 'Find rooms' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Monday' }));
    fireEvent.change(screen.getByLabelText('End'), { target: { value: '14:00' } });
    expect(screen.getByText('The end must be after the start.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Find rooms' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows why a search failed, and the empty case', async () => {
    api.getFree.mockImplementationOnce(() => Promise.reject(Object.assign(new Error('400'), { response: { data: { error: 'end qiymati start dan keyin bo\'lishi kerak' } } })));
    render(<RoomFinderTab onAssign={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Find rooms' }));
    expect(await screen.findByRole('alert')).toBeTruthy();

    api.getFree.mockResolvedValueOnce({ data: { ...found, rooms: [], summary: { free_on_all: 0, free_on_some: 0 } } });
    fireEvent.click(screen.getByRole('button', { name: 'Find rooms' }));
    expect(await screen.findByText('No room is free on all of these days at this time.')).toBeTruthy();
  });
});
