import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { RoomAssignmentDialog, type RoomFormData } from '../components/RoomAssignmentDialog';

const i18n = vi.hoisted(() => ({
  t: (value: string, vars?: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`)),
}));
vi.mock('@/i18n/LanguageContext', () => ({ useLanguage: () => i18n }));
vi.mock('@/shared/groupLabel', () => ({ formatGroupLabel: (group: { class_name: string }) => group.class_name }));

const start = (overrides: Partial<RoomFormData> = {}): RoomFormData => ({
  room_number: '5', nickname: '', capacity: '', class_id: '', day: 'Monday', days: ['Monday'], time: '15:00', end_time: '16:30', ...overrides,
});

const Harness = ({ initial, editing = false, mode = 'assignment', onForm }: { initial: RoomFormData; editing?: boolean; mode?: 'room' | 'assignment'; onForm?: (form: RoomFormData) => void }) => {
  const [form, setForm] = useState(initial);
  return (
    <RoomAssignmentDialog open editing={editing} mode={mode} submitting={false} form={form} teacherId="" teachers={[]} classes={[]}
      onForm={(next) => { setForm(next); onForm?.(next); }} onTeacher={vi.fn()} onClose={vi.fn()} onSubmit={vi.fn()} />
  );
};

describe('room assignment dialog', () => {
  it('lets a new lesson repeat on several days, in week order, with day presets', () => {
    const seen: RoomFormData[] = [];
    render(<Harness initial={start()} onForm={(form) => seen.push(form)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Friday' }));
    fireEvent.click(screen.getByRole('button', { name: 'Wednesday' }));
    expect(seen.at(-1)).toMatchObject({ days: ['Monday', 'Wednesday', 'Friday'], day: 'Monday' });
    expect(screen.getByRole('button', { name: 'Wednesday' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Tu–Th–Sa' }));
    expect(seen.at(-1)).toMatchObject({ days: ['Tuesday', 'Thursday', 'Saturday'], day: 'Tuesday' });
  });

  it('keeps at least one day chosen', () => {
    const seen: RoomFormData[] = [];
    render(<Harness initial={start()} onForm={(form) => seen.push(form)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Monday' }));
    expect(seen).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Monday' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('edits an existing lesson on one day only', () => {
    render(<Harness initial={start({ class_id: '7' })} editing />);
    expect(screen.queryByRole('group', { name: 'Days' })).toBeNull();
    expect(screen.getByLabelText('Assignment day')).toBeTruthy();
  });

  it('asks for the extra name only when creating a room', () => {
    const { unmount } = render(<Harness initial={start({ room_number: '' })} mode="room" />);
    expect(screen.getByLabelText('Extra name (in brackets)')).toBeTruthy();
    unmount();
    render(<Harness initial={start()} />);
    expect(screen.queryByLabelText('Extra name (in brackets)')).toBeNull();
  });
});
