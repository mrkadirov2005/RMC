import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider, useLanguage, type TranslationVars } from '../LanguageContext';

vi.mock('../api', () => ({
  translationAPI: { getAll: vi.fn().mockResolvedValue({ data: [] }), save: vi.fn() },
}));

const Probe = ({ text, vars }: { text: string; vars?: TranslationVars }) => {
  const { t } = useLanguage();
  return <p data-testid="out">{t(text, vars)}</p>;
};

const translate = async (text: string, vars?: TranslationVars) => {
  const { unmount } = render(
    <LanguageProvider>
      <Probe text={text} vars={vars} />
    </LanguageProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('out')).toBeTruthy());
  const result = screen.getByTestId('out').textContent;
  unmount();
  return result;
};

describe('t() placeholders', () => {
  it('fills values into a translated sentence, keeping the Uzbek word order', async () => {
    expect(
      await translate(
        'The class "{name}" has {count} attendance record(s). Deleting anyway will remove those records and the class.',
        { name: 'A1 Movers', count: 3 },
      ),
    ).toBe(`"A1 Movers" guruhida 3 ta davomat yozuvi bor. Baribir o'chirsangiz, bu yozuvlar va guruh o'chiriladi.`);
  });

  it('fills values into text that has no translation', async () => {
    expect(await translate('Hello {name}, you have {count} items', { name: 'Ali', count: 2 })).toBe(
      'Hello Ali, you have 2 items',
    );
  });

  it('replaces every occurrence of a repeated placeholder', async () => {
    expect(await translate('{n} of {n}', { n: 5 })).toBe('5 of 5');
  });

  it('renders zero instead of treating it as missing', async () => {
    expect(await translate('{count} left', { count: 0 })).toBe('0 left');
  });

  it('leaves a placeholder alone when no value is given for it', async () => {
    expect(await translate('Hi {who}', {})).toBe('Hi {who}');
    expect(await translate('Hi {who}')).toBe('Hi {who}');
  });

  it('does not read inherited object properties as values', async () => {
    expect(await translate('{constructor} {toString}', {})).toBe('{constructor} {toString}');
  });
});
