jest.mock('../../../../db/pool', () => ({ query: jest.fn() }));

const pool = require('../../../../db/pool');
const service = require('../flashcards.service');

const now = new Date('2026-10-31T10:00:00Z');
const days = (date) => Math.round((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
const rows = (list) => ({ rows: list });

describe('flashcards service', () => {
  beforeEach(() => jest.clearAllMocks());

  // @MOB-145
  describe('schedule', () => {
    it('brings a new card back after 1 day (good), 4 days (easy) or 10 minutes (again)', () => {
      expect(days(service.schedule(null, 'good', now).due_at)).toBe(1);
      expect(days(service.schedule(null, 'easy', now).due_at)).toBe(4);
      expect(days(service.schedule(null, 'hard', now).due_at)).toBe(1);
      const again = service.schedule(null, 'again', now);
      expect(again.due_at.getTime() - now.getTime()).toBe(10 * 60 * 1000);
      expect(again).toMatchObject({ interval_days: 0, repetitions: 0, ease: 2.3 });
    });

    it('grows the interval with good answers: 1, 3, then interval × ease', () => {
      let state = null;
      const intervals = [];
      for (let i = 0; i < 4; i += 1) {
        state = service.schedule(state, 'good', now);
        intervals.push(state.interval_days);
      }
      expect(intervals).toEqual([1, 3, 8, 20]);
    });

    it('gives hard and easy different next dates and moves ease the opposite ways', () => {
      const state = { ease: 2.5, interval_days: 10, repetitions: 3, lapses: 0 };
      const hard = service.schedule(state, 'hard', now);
      const easy = service.schedule(state, 'easy', now);
      expect(hard).toMatchObject({ interval_days: 12, ease: 2.35 });
      expect(easy).toMatchObject({ interval_days: 33, ease: 2.65 });
      expect(days(easy.due_at)).toBeGreaterThan(days(hard.due_at));
    });

    it('never lets ease fall below 1.3 and counts lapses of learned cards', () => {
      let state = { ease: 1.35, interval_days: 5, repetitions: 2, lapses: 0 };
      state = service.schedule(state, 'again', now);
      expect(state).toMatchObject({ ease: 1.3, lapses: 1 });
      expect(service.schedule(state, 'again', now).lapses).toBe(1);
    });
  });

  it('builds a session from due cards and up to 10 new words a day', async () => {
    pool.query
      .mockResolvedValueOnce(rows([{ consolidation_word_id: 1, main_word: 'reliable', translations: ['ishonchli'], due_at: now, interval_days: 3, set_title: 'Unit 7' }]))
      .mockResolvedValueOnce(rows([{ count: 4 }]))
      .mockResolvedValueOnce(rows([{ total: 30, seen: 12, due: 1, learned: 2 }]))
      .mockResolvedValueOnce(rows([{ consolidation_word_id: 2, main_word: 'brave', translations: ['jasur', 'botir'] }]));
    const result = await service.session(7, now);
    expect(result.cards).toEqual([
      { word_id: 1, front: 'reliable', back: 'ishonchli', set_title: 'Unit 7', class_name: null, is_new: false, interval_days: 3 },
      { word_id: 2, front: 'brave', back: 'jasur, botir', set_title: null, class_name: null, is_new: true, interval_days: null },
    ]);
    expect(result.stats).toEqual({ total: 30, due: 1, new: 18, learned: 2, new_today_left: 6 });
    expect(pool.query.mock.calls[3][1]).toEqual([7, 6]);
  });

  it('offers no new words once today\'s ten are used', async () => {
    pool.query.mockResolvedValueOnce(rows([])).mockResolvedValueOnce(rows([{ count: 10 }])).mockResolvedValueOnce(rows([{ total: 5, seen: 5, due: 0, learned: 0 }]));
    await expect(service.session(7, now)).resolves.toMatchObject({ cards: [], stats: { new_today_left: 0 } });
    expect(pool.query).toHaveBeenCalledTimes(3);
  });

  it('records a review for a word of the student\'s groups only', async () => {
    await expect(service.review(7, 1, 'maybe', now)).resolves.toEqual({ kind: 'invalid' });
    pool.query.mockResolvedValueOnce(rows([]));
    await expect(service.review(7, 1, 'good', now)).resolves.toEqual({ kind: 'not_found' });

    pool.query
      .mockResolvedValueOnce(rows([{ consolidation_word_id: 1 }]))
      .mockResolvedValueOnce(rows([{ ease: '2.50', interval_days: 3, repetitions: 2, lapses: 0 }]))
      .mockResolvedValueOnce(rows([{ due_at: new Date('2026-11-08T10:00:00Z'), interval_days: 8, ease: '2.50', repetitions: 3 }]));
    await expect(service.review(7, 1, 'good', now)).resolves.toEqual({
      kind: 'ok', review: { word_id: 1, grade: 'good', due_at: new Date('2026-11-08T10:00:00Z'), interval_days: 8, ease: 2.5 },
    });
    const params = pool.query.mock.calls[3][1];
    expect(params.slice(0, 6)).toEqual([7, 1, 2.5, 8, 3, 0]);
    expect(params[7]).toBe('good');
  });
});
