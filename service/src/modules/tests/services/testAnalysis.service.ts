// How a test went, for its results page: the totals, how the scores spread, and which questions
// students got wrong most. Counts every graded attempt.
const pool = require('../../../db/pool');

/** Score bands of the spread chart, in percent: [from, to) except the last, which includes 100. */
const SCORE_BANDS: Array<[number, number]> = [[0, 40], [40, 50], [50, 60], [60, 70], [70, 80], [80, 90], [90, 100]];

const testAnalysis = async (testId: number) => {
  const totals = (await pool.query(
    `SELECT COUNT(*)::int AS attempts,
            COUNT(DISTINCT student_id)::int AS students,
            COUNT(*) FILTER (WHERE COALESCE(is_passed, false))::int AS passed,
            ROUND(AVG(percentage)::numeric, 1)::float AS average,
            ROUND(MAX(percentage)::numeric, 1)::float AS best,
            ROUND(AVG(time_taken_seconds)::numeric)::int AS average_seconds
       FROM test_submissions WHERE test_id = $1 AND status = 'graded'`,
    [testId]
  )).rows[0];
  const waiting = (await pool.query(`SELECT COUNT(*)::int AS n FROM test_submissions WHERE test_id = $1 AND status = 'submitted'`, [testId])).rows[0].n;

  const percentages = (await pool.query(`SELECT percentage FROM test_submissions WHERE test_id = $1 AND status = 'graded'`, [testId])).rows.map(
    (row: any) => Number(row.percentage) || 0
  );
  const distribution = SCORE_BANDS.map(([from, to], index) => ({
    from,
    to,
    count: percentages.filter((value: number) => value >= from && (index === SCORE_BANDS.length - 1 ? value <= to : value < to)).length,
  }));

  // Each question: how many graded attempts answered it, and how many got it right.
  const questions = (await pool.query(
    `SELECT q.question_id, q.question_order, q.question_text, q.question_type,
            COUNT(a.answer_id)::int AS answered,
            COUNT(a.answer_id) FILTER (WHERE a.is_correct)::int AS correct
       FROM test_questions q
       LEFT JOIN test_answers a ON a.question_id = q.question_id
        AND a.submission_id IN (SELECT submission_id FROM test_submissions WHERE test_id = $1 AND status = 'graded')
      WHERE q.test_id = $1
      GROUP BY q.question_id
      ORDER BY q.question_order, q.question_id`,
    [testId]
  )).rows;

  return {
    totals: { ...totals, waiting, pass_rate: totals.attempts > 0 ? Math.round((totals.passed / totals.attempts) * 100) : null },
    distribution,
    questions: questions.map((row: any) => ({
      ...row,
      // Out of every graded attempt: a question left blank counts as not right.
      attempts: totals.attempts,
      correct_rate: totals.attempts > 0 ? Math.round((row.correct / totals.attempts) * 100) : null,
    })),
  };
};

module.exports = { testAnalysis, SCORE_BANDS };

export {};
