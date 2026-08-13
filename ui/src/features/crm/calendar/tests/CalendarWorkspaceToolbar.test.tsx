import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CalendarWorkspaceToolbar } from '../components/CalendarWorkspaceToolbar';

describe('CalendarWorkspaceToolbar', () => {
  it('exposes navigation and view state through accessible controls', () => {
    const onView = vi.fn();
    const onMove = vi.fn();
    const onToday = vi.fn();
    const onDate = vi.fn();
    render(<CalendarWorkspaceToolbar anchor={new Date(2026, 7, 13, 12)} view="week" onView={onView} onMove={onMove} onToday={onToday} onDate={onDate} />);

    expect(screen.getByRole('toolbar', { name: 'Calendar navigation' })).toBeInTheDocument();
    expect(screen.getByTestId('calendar-view-week')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('calendar-view-day')).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByTestId('calendar-today'));
    fireEvent.click(screen.getByRole('button', { name: 'Previous period' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next period' }));
    fireEvent.click(screen.getByTestId('calendar-view-agenda'));
    expect(onToday).toHaveBeenCalledOnce();
    expect(onMove.mock.calls).toEqual([[-1], [1]]);
    expect(onView).toHaveBeenCalledWith('agenda');
  });

  it('sends a local midday date to avoid timezone boundary drift', () => {
    const onDate = vi.fn();
    render(<CalendarWorkspaceToolbar anchor={new Date(2026, 7, 13, 12)} view="day" onView={vi.fn()} onMove={vi.fn()} onToday={vi.fn()} onDate={onDate} />);
    fireEvent.change(screen.getByLabelText('Go to date'), { target: { value: '2026-08-20' } });
    expect(onDate).toHaveBeenCalledOnce();
    expect(onDate.mock.calls[0][0].getFullYear()).toBe(2026);
    expect(onDate.mock.calls[0][0].getMonth()).toBe(7);
    expect(onDate.mock.calls[0][0].getDate()).toBe(20);
    expect(onDate.mock.calls[0][0].getHours()).toBe(12);
  });
});
