import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fixUzbekSpelling } from '../uzbekSpelling';

describe('fixUzbekSpelling', () => {
  it('restores apostrophes and keeps the original capitalisation', () => {
    expect(fixUzbekSpelling('Oquvchilar')).toBe("O'quvchilar");
    expect(fixUzbekSpelling('oqituvchi tolov korish boyicha')).toBe("o'qituvchi to'lov ko'rish bo'yicha");
    expect(fixUzbekSpelling('TOLOV')).toBe("TO'LOV");
    expect(fixUzbekSpelling('Malumot yoq')).toBe("Ma'lumot yo'q");
  });

  it('leaves correct text and English text alone', () => {
    for (const text of ["O'quvchilar", "To'lov sanasi", 'Save changes', 'Students', "Yorug' rejimga o'tish"]) {
      expect(fixUzbekSpelling(text)).toBe(text);
    }
  });

  it('is idempotent, so applying it twice never doubles an apostrophe', () => {
    const once = fixUzbekSpelling('Yorug rejimga otish, tolov, malumot');
    expect(once).toBe("Yorug' rejimga o'tish, to'lov, ma'lumot");
    expect(fixUzbekSpelling(once)).toBe(once);
  });

  it('does not touch words that are valid without an apostrophe', () => {
    for (const text of ['Bosh sahifa', 'Tarif rejasi', 'oz miqdorda', 'Tahrirlash rejimi yoqilgan']) {
      expect(fixUzbekSpelling(text)).toBe(text);
    }
  });

  it('fixes "bosh qoldiring" (leave empty) but not "bosh" (head, main)', () => {
    expect(fixUzbekSpelling('Parolni saqlash uchun bosh qoldiring')).toBe("Parolni saqlash uchun bo'sh qoldiring");
    expect(fixUzbekSpelling("Yo'qilgan")).toBe('Yoqilgan');
  });
});

describe('Uzbek dictionary spelling', () => {
  const i18nDir = `${resolve(process.cwd(), 'src/i18n')}/`;
  const files = [
    `${i18nDir}LanguageContext.tsx`,
    `${i18nDir}sharedMessages.ts`,
    ...readdirSync(`${i18nDir}labels`)
      .filter((name) => name !== 'index.ts')
      .map((name) => `${i18nDir}labels/${name}`),
  ];

  it('has no Uzbek value with a fixable missing apostrophe', () => {
    const entry = /^\s*(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|[A-Za-z_$][\w$]*)\s*:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"),?\s*$/;
    const typos: string[] = [];
    let checked = 0;
    for (const file of files) {
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        const match = line.match(entry);
        if (!match) continue;
        const value = (match[1] ?? match[2]).replace(/\\'/g, "'");
        checked += 1;
        const fixed = fixUzbekSpelling(value);
        if (fixed !== value) typos.push(`${value}  =>  ${fixed}`);
      }
    }
    expect(checked).toBeGreaterThan(2000);
    expect(typos).toEqual([]);
  });
});
