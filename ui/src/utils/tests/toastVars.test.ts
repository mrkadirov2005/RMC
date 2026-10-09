import { describe, expect, it } from 'vitest';
import { TOP_STATUS_MESSAGE_EVENT, showToast } from '../toast';

describe('top status messages', () => {
  it('send placeholder values with the message, so the line can translate it', () => {
    const seen: unknown[] = [];
    const listener = (event: Event) => seen.push((event as CustomEvent).detail);
    window.addEventListener(TOP_STATUS_MESSAGE_EVENT, listener);
    showToast.success('Deleted {count} student(s).', { vars: { count: 3 } });
    window.removeEventListener(TOP_STATUS_MESSAGE_EVENT, listener);
    expect(seen).toEqual([{ message: 'Deleted {count} student(s).', variant: 'success', vars: { count: 3 }, autoClose: 3000 }]);
  });
});
