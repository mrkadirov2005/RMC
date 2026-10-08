import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActionReasonPicker } from '../ActionReasonPicker';

vi.mock('@/i18n/LanguageContext', () => ({ useLanguage: () => ({ t: (value: string) => value }) }));
vi.mock('../../api/studentsApi', () => ({
  studentsApi: {
    getActionReasons: vi.fn(async () => ({ data: [
      { reason_id: 1, reason_name: 'Maktab boshlanib qoldi, ulgurmayapti', needs_note: false },
      { reason_id: 3, reason_name: 'Muvaffaqiyatli tugatib natijaga erishdi', needs_note: true },
    ] })),
  },
}));

describe('leaving reason picker', () => {
  it('asks for a note when the chosen reason needs one', async () => {
    const onNeedsNoteChange = vi.fn();
    render(
      <ActionReasonPicker reasonType="delete" open value="3" customValue="" onChange={() => {}} onCustomChange={() => {}}
        allowCustom={false} note="" onNoteChange={() => {}} onNeedsNoteChange={onNeedsNoteChange} />,
    );
    await waitFor(() => expect(onNeedsNoteChange).toHaveBeenLastCalledWith(true));
    expect(screen.getByText('Note (required)')).toBeTruthy();
  });

  it('keeps the note optional for other reasons', async () => {
    const onNeedsNoteChange = vi.fn();
    render(
      <ActionReasonPicker reasonType="delete" open value="1" customValue="" onChange={() => {}} onCustomChange={() => {}}
        allowCustom={false} note="" onNoteChange={() => {}} onNeedsNoteChange={onNeedsNoteChange} />,
    );
    await waitFor(() => expect(onNeedsNoteChange).toHaveBeenCalled());
    expect(onNeedsNoteChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByText('Note (optional)')).toBeTruthy();
  });
});
