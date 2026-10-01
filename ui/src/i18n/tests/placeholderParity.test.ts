import { describe, expect, it } from 'vitest';
import { pageLabelTranslations } from '../labels';
import { sharedMessageTranslations } from '../sharedMessages';

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort().join(',');

describe('translation placeholders', () => {
  it('keeps the same placeholders in every English key and its Uzbek value', () => {
    const mismatched = Object.entries({ ...sharedMessageTranslations, ...pageLabelTranslations })
      .filter(([english, uzbek]) => placeholders(english) !== placeholders(uzbek))
      .map(([english, uzbek]) => `${english}  =>  ${uzbek}`);
    expect(mismatched).toEqual([]);
  });

  it('has at least one placeholder entry, so the check above is not vacuous', () => {
    const withPlaceholders = Object.keys(pageLabelTranslations).filter((key) => placeholders(key));
    expect(withPlaceholders.length).toBeGreaterThan(40);
  });
});
