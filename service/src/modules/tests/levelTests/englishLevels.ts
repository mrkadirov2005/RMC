// The built-in English level tests (Beginner to C1), one per level of the English ladder: grammar,
// vocabulary and a reading text, all auto-graded, so the score is ready when the student finishes.
// installEnglishLevelTests puts them into a center as ordinary tests; each carries
// test_data.level_test = { scale: 'English', level, key }, so a test is installed once per center
// and the achievements and the mobile app can find a level's test.
import type { LevelTest } from './levelTestTypes';
const pool = require('../../../db/pool');
const { BASIC_LEVEL_TESTS } = require('./englishLevelsBasic');
const { MIDDLE_LEVEL_TESTS } = require('./englishLevelsMiddle');
const { UPPER_LEVEL_TESTS } = require('./englishLevelsUpper');

// The questions are written with the right answer wherever it fell; each one is moved to a place
// worked out from the test and the question number, so A-D come up about equally and the same
// test always has the same order.
const placeOf = (key: string, index: number) => {
  let hash = 0;
  for (const char of `${key}:${index}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 4;
};

const spreadAnswers = (test: LevelTest): LevelTest => ({
  ...test,
  questions: test.questions.map((question, index) => {
    if (question.type !== 'multiple_choice' || !question.options) return question;
    const options = [...question.options];
    const target = placeOf(test.key, index) % options.length;
    const current = Number(question.answer);
    [options[current], options[target]] = [options[target], options[current]];
    return { ...question, options, answer: target };
  }),
});

const ENGLISH_LEVEL_TESTS: LevelTest[] = [...BASIC_LEVEL_TESTS, ...MIDDLE_LEVEL_TESTS, ...UPPER_LEVEL_TESTS].map(spreadAnswers);

/** Share of the marks needed to pass a level test. */
const PASS_SHARE = 0.7;

const SECTION_TITLES = { grammar: 'Grammar', vocabulary: 'Vocabulary', reading: 'Reading' } as const;

const describeLevelTest = (test: LevelTest) => ({
  key: test.key,
  level: test.level,
  title: test.title,
  duration_minutes: test.durationMinutes,
  questions: test.questions.length,
  sections: (['grammar', 'vocabulary', 'reading'] as const).map((section) => ({
    section,
    title: SECTION_TITLES[section],
    questions: test.questions.filter((question) => question.section === section).length,
  })),
});

/** Keys of the level tests already in a center. */
const installedKeys = async (centerId: number, db: any = pool) => {
  const { rows } = await db.query(
    `SELECT test_data->'level_test'->>'key' AS key, test_id FROM tests
      WHERE center_id = $1 AND test_data->'level_test'->>'key' IS NOT NULL`,
    [centerId]
  );
  return new Map<string, number>(rows.map((row: any) => [row.key, Number(row.test_id)]));
};

const listEnglishLevelTests = async (centerId: number) => {
  const installed = await installedKeys(centerId);
  return ENGLISH_LEVEL_TESTS.map((test) => ({ ...describeLevelTest(test), installed_test_id: installed.get(test.key) ?? null }));
};

const insertLevelTest = async (db: any, test: LevelTest, centerId: number, createdBy: number | null, createdByType: string | null) => {
  const totalMarks = test.questions.length;
  const { rows } = await db.query(
    `INSERT INTO tests (center_id, test_name, test_type, description, instructions, total_marks, passing_marks,
                        duration_minutes, assignment_type, is_timed, shuffle_questions, show_results_immediately,
                        allow_retake, max_retakes, test_data, created_by, created_by_type, is_active, is_private)
     VALUES ($1, $2, 'multiple_choice', $3, $4, $5, $6, $7, 'all_students', TRUE, FALSE, TRUE, TRUE, 3, $8::jsonb, $9, $10, TRUE, FALSE)
     RETURNING test_id`,
    [
      centerId,
      test.title,
      `Checks the ${test.level} level: grammar, vocabulary and reading. Pass mark ${Math.round(PASS_SHARE * 100)}%.`,
      'Answer every question. Grammar and vocabulary come first, then read the text and answer the questions about it.',
      totalMarks,
      Math.ceil(totalMarks * PASS_SHARE),
      test.durationMinutes,
      JSON.stringify({
        level_test: { scale: 'English', level: test.level, key: test.key, version: 1 },
        sections: describeLevelTest(test).sections,
      }),
      createdBy,
      createdByType,
    ]
  );
  const testId = Number(rows[0].test_id);
  const passage = await db.query(
    `INSERT INTO reading_passages (center_id, test_id, title, content, word_count, difficulty_level, passage_order)
     VALUES ($1, $2, $3, $4, $5, $6, 1) RETURNING passage_id`,
    [centerId, testId, test.passage.title, test.passage.content, test.passage.content.split(/\s+/).filter(Boolean).length, test.level]
  );
  const passageId = Number(passage.rows[0].passage_id);
  for (const [index, question] of test.questions.entries()) {
    await db.query(
      `INSERT INTO test_questions (center_id, test_id, passage_id, question_text, question_type, marks, negative_marks,
                                   question_order, options, correct_answer, explanation, is_required)
       VALUES ($1, $2, $3, $4, $5, 1, 0, $6, $7::jsonb, $8::jsonb, $9, TRUE)`,
      [
        centerId,
        testId,
        question.section === 'reading' ? passageId : null,
        question.text,
        question.type,
        index + 1,
        question.options ? JSON.stringify(question.options) : null,
        JSON.stringify(question.type === 'true_false' ? { value: question.answer } : { index: question.answer }),
        question.explanation || null,
      ]
    );
  }
  return testId;
};

/** Adds the level tests a center does not have yet; returns the ids of the new ones. */
const installEnglishLevelTests = async ({ centerId, createdBy, createdByType }: { centerId: number; createdBy: number | null; createdByType: string | null }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // One install at a time per center, so two clicks cannot add a test twice.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`english-level-tests:${centerId}`]);
    const installed = await installedKeys(centerId, client);
    const created: Array<{ key: string; level: string; test_id: number }> = [];
    for (const test of ENGLISH_LEVEL_TESTS) {
      if (installed.has(test.key)) continue;
      created.push({ key: test.key, level: test.level, test_id: await insertLevelTest(client, test, centerId, createdBy, createdByType) });
    }
    await client.query('COMMIT');
    return { created, already_installed: installed.size };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { ENGLISH_LEVEL_TESTS, PASS_SHARE, listEnglishLevelTests, installEnglishLevelTests };

export {};
