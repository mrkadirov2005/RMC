import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider, useLanguage } from '../LanguageContext';

vi.mock('../api', () => ({
  translationAPI: {
    getAll: vi.fn().mockResolvedValue({
      data: [
        { id: 'Students', english: 'Students', uzbek: 'Oquvchilar' },
        { id: 'Teachers', english: 'Teachers', uzbek: 'Oqituvchilar' },
        { id: 'Payments', english: 'Payments', uzbek: "To'lovlar" },
      ],
    }),
    save: vi.fn(),
  },
}));

const Probe = ({ text }: { text: string }) => {
  const { t } = useLanguage();
  return <p data-testid="out">{t(text)}</p>;
};

const translated = async (text: string, expected: string) => {
  const { unmount } = render(
    <LanguageProvider>
      <Probe text={text} />
    </LanguageProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('out').textContent).toBe(expected));
  unmount();
};

describe('translations loaded from the database', () => {
  it('restores missing apostrophes in saved rows (the sidebar showed "Oquvchilar")', async () => {
    await translated('Students', "O'quvchilar");
    await translated('Teachers', "O'qituvchilar");
  });

  it('leaves rows that are already spelled correctly alone', async () => {
    await translated('Payments', "To'lovlar");
  });
});
