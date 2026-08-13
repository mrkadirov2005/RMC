import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RoomFilters } from '../components/RoomFilters';

const filters = {
  date: '2026-08-10',
  start: '09:00',
  end: '10:00',
  room: '',
  teacherId: '',
  subject: '',
};

describe('RoomFilters', () => {
  it('exposes labelled filters and reports the complete next filter state', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RoomFilters
      filters={filters}
      onChange={onChange}
      rooms={['Room 101']}
      teachers={[{ id: '7', label: 'Ada Lovelace' }]}
      subjects={[{ id: '9', label: 'English' }]}
    />);

    expect(screen.getByLabelText('Schedule date')).toHaveValue('2026-08-10');
    expect(screen.getByLabelText('Start time')).toHaveValue('09:00');
    expect(screen.getByLabelText('End time')).toHaveValue('10:00');

    await user.selectOptions(screen.getByLabelText('Filter by teacher'), '7');
    expect(onChange).toHaveBeenLastCalledWith({ ...filters, teacherId: '7' });

    await user.selectOptions(screen.getByLabelText('Filter by subject'), '9');
    expect(onChange).toHaveBeenLastCalledWith({ ...filters, subject: '9' });
  });
});
