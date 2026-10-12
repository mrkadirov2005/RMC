import { afterEach, describe, expect, it } from 'vitest';
import { translateStaticDom, watchStaticDom } from '../LanguageContext';

const map = { Journals: 'Jurnallar', 'User type': 'Foydalanuvchi turi', 'Search…': 'Qidirish…' };
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

describe('translating text typed straight into pages', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('translates exact matches only, leaving names and longer text alone', () => {
    document.body.innerHTML = '<p>Journals</p><p>Journals of Ali</p><input placeholder="Search…" /><div data-translation-skip>Journals</div>';
    translateStaticDom(map);
    const texts = Array.from(document.querySelectorAll('p, div')).map((node) => node.textContent);
    expect(texts).toEqual(['Jurnallar', 'Journals of Ali', 'Journals']);
    expect(document.querySelector('input')?.getAttribute('placeholder')).toBe('Qidirish…');
  });

  it('keeps translating content that appears after the page loaded', async () => {
    const stop = watchStaticDom(map);
    const cell = document.createElement('th');
    cell.textContent = 'User type';
    document.body.appendChild(cell);
    await nextFrame();
    expect(cell.textContent).toBe('Foydalanuvchi turi');

    cell.firstChild!.nodeValue = 'Journals';
    await nextFrame();
    expect(cell.textContent).toBe('Jurnallar');
    stop();
  });
});
