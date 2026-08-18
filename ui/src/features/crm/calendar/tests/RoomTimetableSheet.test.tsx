import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RoomTimetableSheet } from '../components/RoomTimetableSheet';
import type { CalendarEvent } from '../calendarWorkspace';

// 2026-08-17 is a Monday, which falls in the "mwf" weekday pattern.
const recurringEvent: CalendarEvent = {
  event_id: 'planned-class-1-2026-08-17',
  source: 'recurring',
  status: 'planned',
  date: '2026-08-17',
  start_time: '08:00:00',
  end_time: '09:00:00',
  class_id: 1,
  class_name: 'Math 101',
  room_name: '101',
};

const sessionEvent: CalendarEvent = {
  ...recurringEvent,
  event_id: 'session-99',
  session_id: 99,
  source: 'session',
  status: 'ready',
};

const conductedEvent: CalendarEvent = {
  ...recurringEvent,
  event_id: 'session-100',
  session_id: 100,
  source: 'session',
  status: 'conducted',
};

const makeDataTransfer = () => {
  const store = new Map<string, string>();
  return {
    effectAllowed: '',
    setData: (type: string, value: string) => store.set(type, value),
    getData: (type: string) => store.get(type) || '',
  };
};

describe('RoomTimetableSheet drag and drop', () => {
  it('moves a recurring lesson into a free room slot', () => {
    const onMove = vi.fn();
    render(
      <RoomTimetableSheet
        events={[recurringEvent]}
        roomNames={['101']}
        onSelect={vi.fn()}
        onMove={onMove}
        canMove
      />
    );

    const source = screen.getByTestId(`calendar-event-${recurringEvent.event_id}`);
    expect(source).toHaveAttribute('draggable', 'true');

    const dataTransfer = makeDataTransfer();
    fireEvent.dragStart(source, { dataTransfer });

    const freeCells = screen.getAllByText('Free');
    expect(freeCells.length).toBeGreaterThan(0);
    const targetCell = freeCells[0].closest('td')!;

    fireEvent.dragOver(targetCell, { dataTransfer });
    fireEvent.drop(targetCell, { dataTransfer });

    expect(onMove).toHaveBeenCalledTimes(1);
    const [movedEvent, room, pattern] = onMove.mock.calls[0];
    expect(movedEvent.event_id).toBe(recurringEvent.event_id);
    expect(room).toBe('101');
    expect(pattern).toBe('mwf');
  });

  it('allows dragging a lesson that already has a session created but not yet started', () => {
    const onMove = vi.fn();
    render(
      <RoomTimetableSheet
        events={[sessionEvent]}
        roomNames={['101']}
        onSelect={vi.fn()}
        onMove={onMove}
        canMove
      />
    );

    const source = screen.getByTestId(`calendar-event-${sessionEvent.event_id}`);
    expect(source).toHaveAttribute('draggable', 'true');

    const dataTransfer = makeDataTransfer();
    fireEvent.dragStart(source, { dataTransfer });
    const targetCell = screen.getAllByText('Free')[0].closest('td')!;
    fireEvent.dragOver(targetCell, { dataTransfer });
    fireEvent.drop(targetCell, { dataTransfer });

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove.mock.calls[0][0].event_id).toBe(sessionEvent.event_id);
  });

  it('does not allow dragging a lesson that has already been conducted or is in progress', () => {
    const onMove = vi.fn();
    render(
      <RoomTimetableSheet
        events={[conductedEvent]}
        roomNames={['101']}
        onSelect={vi.fn()}
        onMove={onMove}
        canMove
      />
    );

    const source = screen.getByTestId(`calendar-event-${conductedEvent.event_id}`);
    expect(source).toHaveAttribute('draggable', 'false');
  });
});
