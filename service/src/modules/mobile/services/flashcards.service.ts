const pool = require('../../../db/pool');

const query = (text: string, params: any[] = []) => pool.query(text, params).then((r: any) => r.rows);
const one = (text: string, params: any[] = []) => query(text, params).then((rows: any[]) => rows[0] || null);

type Grade = 'again' | 'hard' | 'good' | 'easy';
const GRADES: Grade[] = ['again', 'hard', 'good', 'easy'];
type State = { ease: number; interval_days: number; repetitions: number; lapses: number };

const MIN_EASE = 1.3;
const AGAIN_MINUTES = 10;
const NEW_PER_DAY = 10;
const SESSION_SIZE = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

const round2 = (n: number) => Math.round(n * 100) / 100;

// @MOB-145 SM-2 style scheduling with four answers:
//   again → back in 10 minutes, the run starts over, ease −0.2
//   hard  → a little longer than last time (×1.2, at least 1 day), ease −0.15
//   good  → 1 day, then 3 days, then interval × ease
//   easy  → like good with a 1.3× bonus (first time: 4 days), ease +0.15
// So hard and easy always land on different days.
const schedule = (state: State | null, grade: Grade, now = new Date()) => {
  const prev: State = state ?? { ease: 2.5, interval_days: 0, repetitions: 0, lapses: 0 };
  let { ease, interval_days: interval, repetitions, lapses } = prev;
  ease = Number(ease);
  if (grade === 'again') {
    return {
      ease: round2(Math.max(MIN_EASE, ease - 0.2)),
      interval_days: 0,
      repetitions: 0,
      lapses: lapses + (prev.repetitions > 0 ? 1 : 0),
      due_at: new Date(now.getTime() + AGAIN_MINUTES * 60 * 1000),
    };
  }
  if (grade === 'hard') {
    interval = Math.max(1, Math.round(interval * 1.2));
    ease = Math.max(MIN_EASE, ease - 0.15);
  } else {
    const good = repetitions === 0 ? 1 : repetitions === 1 ? 3 : Math.round(interval * ease);
    if (grade === 'easy') {
      interval = repetitions === 0 ? 4 : Math.round(good * 1.3);
      ease += 0.15;
    } else {
      interval = good;
    }
  }
  return { ease: round2(ease), interval_days: interval, repetitions: repetitions + 1, lapses, due_at: new Date(now.getTime() + interval * DAY_MS) };
};

// Words of consolidation sets in any of the student's groups (all their records).
const WORDS_OF_STUDENT = `
  SELECT w.consolidation_word_id, w.main_word, w.translations, cs.consolidation_set_id, cs.title AS set_title, c.class_name
  FROM consolidation_words w
  JOIN consolidation_sets cs ON cs.consolidation_set_id = w.consolidation_set_id AND cs.deleted_at IS NULL
  LEFT JOIN classes c ON c.class_id = cs.class_id
  WHERE cs.class_id IN (SELECT class_id FROM students WHERE (student_id = $1 OR main_student_id = $1) AND deleted_at IS NULL)`;

const card = (row: any) => ({
  word_id: Number(row.consolidation_word_id),
  front: row.main_word,
  back: (Array.isArray(row.translations) ? row.translations : []).join(', '),
  set_title: row.set_title ?? null,
  class_name: row.class_name ?? null,
  is_new: row.due_at == null,
  interval_days: row.interval_days == null ? null : Number(row.interval_days),
});

// @MOB-145 Today's session: cards due now first, then up to 10 new words a day.
const session = async (studentId: number, now = new Date()) => {
  const [due, newToday, stats] = await Promise.all([
    query(
      `SELECT w.*, r.due_at, r.interval_days FROM (${WORDS_OF_STUDENT}) w
       JOIN flashcard_reviews r ON r.consolidation_word_id = w.consolidation_word_id AND r.student_id = $1
       WHERE r.due_at <= $2 ORDER BY r.due_at LIMIT ${SESSION_SIZE}`,
      [studentId, now],
    ),
    one(`SELECT COUNT(*)::int AS count FROM flashcard_reviews WHERE student_id = $1 AND first_reviewed_at >= date_trunc('day', $2::timestamp)`, [studentId, now]),
    one(
      `SELECT COUNT(*)::int AS total,
              COUNT(r.student_id)::int AS seen,
              COUNT(*) FILTER (WHERE r.due_at <= $2)::int AS due,
              COUNT(*) FILTER (WHERE r.interval_days >= 21)::int AS learned
       FROM (${WORDS_OF_STUDENT}) w
       LEFT JOIN flashcard_reviews r ON r.consolidation_word_id = w.consolidation_word_id AND r.student_id = $1`,
      [studentId, now],
    ),
  ]);
  const newLeft = Math.max(0, NEW_PER_DAY - Number(newToday?.count || 0));
  const fresh = newLeft && due.length < SESSION_SIZE
    ? await query(
        `SELECT w.* FROM (${WORDS_OF_STUDENT}) w
         WHERE NOT EXISTS (SELECT 1 FROM flashcard_reviews r WHERE r.student_id = $1 AND r.consolidation_word_id = w.consolidation_word_id)
         ORDER BY w.consolidation_set_id DESC, w.consolidation_word_id LIMIT $2`,
        [studentId, Math.min(newLeft, SESSION_SIZE - due.length)],
      )
    : [];
  const total = Number(stats?.total || 0);
  return {
    cards: [...due.map(card), ...fresh.map(card)],
    stats: {
      total,
      due: Number(stats?.due || 0),
      new: total - Number(stats?.seen || 0),
      learned: Number(stats?.learned || 0),
      new_today_left: newLeft,
    },
  };
};

// @MOB-145 Records one answer and returns when the card comes back.
const review = async (studentId: number, wordId: number, grade: Grade, now = new Date()) => {
  if (!GRADES.includes(grade)) return { kind: 'invalid' as const };
  const word = await one(`SELECT w.consolidation_word_id FROM (${WORDS_OF_STUDENT}) w WHERE w.consolidation_word_id = $2`, [studentId, wordId]);
  if (!word) return { kind: 'not_found' as const };
  const state = await one(`SELECT ease, interval_days, repetitions, lapses FROM flashcard_reviews WHERE student_id = $1 AND consolidation_word_id = $2`, [studentId, wordId]);
  const next = schedule(state, grade, now);
  const saved = await one(
    `INSERT INTO flashcard_reviews (student_id, consolidation_word_id, ease, interval_days, repetitions, lapses, due_at, last_grade, review_count, first_reviewed_at, last_reviewed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9, $9)
     ON CONFLICT (student_id, consolidation_word_id) DO UPDATE SET
       ease = EXCLUDED.ease, interval_days = EXCLUDED.interval_days, repetitions = EXCLUDED.repetitions, lapses = EXCLUDED.lapses,
       due_at = EXCLUDED.due_at, last_grade = EXCLUDED.last_grade, review_count = flashcard_reviews.review_count + 1, last_reviewed_at = EXCLUDED.last_reviewed_at
     RETURNING due_at, interval_days, ease, repetitions`,
    [studentId, wordId, next.ease, next.interval_days, next.repetitions, next.lapses, next.due_at, grade, now],
  );
  return { kind: 'ok' as const, review: { word_id: wordId, grade, due_at: saved.due_at, interval_days: Number(saved.interval_days), ease: Number(saved.ease) } };
};

module.exports = { schedule, session, review, GRADES };

export {};
