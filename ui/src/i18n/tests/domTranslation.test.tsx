import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../LanguageContext';

vi.mock('../api', () => ({
  translationAPI: { getAll: vi.fn().mockResolvedValue({ data: [] }), save: vi.fn() },
}));

describe('on-screen text translation', () => {
  it('translates text that equals a dictionary entry, but never words inside longer text or data', async () => {
    render(
      <LanguageProvider>
        <p data-testid="whole">Dashboard</p>
        <p data-testid="inside">Review the Dashboard now</p>
        <p data-testid="subject">English</p>
        <p data-testid="class-name">Group A</p>
      </LanguageProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('whole').textContent).toBe('Boshqaruv paneli'));
    expect(screen.getByTestId('inside').textContent).toBe('Review the Dashboard now');
    expect(screen.getByTestId('subject').textContent).toBe('English');
    expect(screen.getByTestId('class-name').textContent).toBe('Group A');
  });
});
