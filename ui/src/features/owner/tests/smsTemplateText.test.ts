import { describe, expect, it } from 'vitest';
import { insertAt, previewTemplate, smsLength } from '../smsTemplateText';

describe('SMS template text', () => {
  it('fills placeholders with sample values and cleans up like the server', () => {
    expect(previewTemplate("Hurmatli ota-ona! {ism} — {qoldiq}. Oʻz vaqtida {yoq}")).toBe("Hurmatli ota-ona! Ali Valiyev - 200 000 so'm. O'z vaqtida");
  });

  it('counts SMS parts: 160 in plain Latin, 153 each when split, 70 otherwise', () => {
    expect(smsLength('a'.repeat(160))).toEqual({ characters: 160, parts: 1, latin: true });
    expect(smsLength('a'.repeat(161)).parts).toBe(2);
    expect(smsLength('a'.repeat(307)).parts).toBe(3);
    expect(smsLength('Привет'.repeat(12))).toMatchObject({ parts: 2, latin: false });
    expect(smsLength('').parts).toBe(0);
  });

  it('inserts a placeholder over the selection', () => {
    expect(insertAt('Salom !', '{ism}', 6, 6)).toEqual({ text: 'Salom {ism}!', cursor: 11 });
    expect(insertAt('Salom XX!', '{ism}', 6, 8)).toEqual({ text: 'Salom {ism}!', cursor: 11 });
  });
});
