import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider, useLanguage } from '../LanguageContext';
import { sharedMessageTranslations } from '../sharedMessages';

vi.mock('../api', () => ({
  translationAPI: { getAll: vi.fn().mockResolvedValue({ data: [] }), save: vi.fn() },
}));

const Probe = ({ text }: { text: string }) => {
  const { t } = useLanguage();
  return <p data-testid="out">{t(text)}</p>;
};

const translate = async (text: string) => {
  const { unmount } = render(
    <LanguageProvider>
      <Probe text={text} />
    </LanguageProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('out')).toBeTruthy());
  const result = screen.getByTestId('out').textContent;
  unmount();
  return result;
};

describe('shared toast and error fallbacks', () => {
  it('translates the API client fallbacks to Uzbek', async () => {
    expect(await translate('Session expired. Please log in again.')).toBe(
      'Sessiya muddati tugadi. Iltimos, qaytadan tizimga kiring.',
    );
  });

  it('translates slice success toasts and failure fallbacks', async () => {
    expect(await translate('Student created successfully')).toBe("O'quvchi muvaffaqiyatli yaratildi");
    expect(await translate('Failed to fetch payments')).toBe("To'lovlarni yuklab bo'lmadi");
  });

  it('leaves text that is not in the dictionary untouched', async () => {
    expect(await translate('Some text nobody translated')).toBe('Some text nobody translated');
  });

  it('never maps a message to an empty string', () => {
    for (const [english, uzbek] of Object.entries(sharedMessageTranslations)) {
      expect(uzbek.trim(), english).not.toBe('');
    }
  });
});
