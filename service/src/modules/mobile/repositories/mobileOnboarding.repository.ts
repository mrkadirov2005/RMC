const pool = require('../../../db/pool');

const query = (text: string, params: any[] = []) => pool.query(text, params).then((r: any) => r.rows);
const one = (text: string, params: any[] = []) => query(text, params).then((rows: any[]) => rows[0] || null);

const LAST9 = (column: string) => `RIGHT(regexp_replace(COALESCE(${column}, ''), '\\D', '', 'g'), 9)`;

const getState = (userType: string, userId: number) =>
  one(`SELECT * FROM mobile_onboarding WHERE user_type = $1 AND user_id = $2`, [userType, userId]);

// Sets the given fields, creating the row on first use.
const saveState = (userType: string, userId: number, fields: { completed?: boolean; skipped?: boolean; telegram?: boolean; instagram?: boolean }) =>
  one(
    `INSERT INTO mobile_onboarding (user_type, user_id, completed_at, skipped, telegram_verified_at, instagram_opened_at)
     VALUES ($1, $2, CASE WHEN $3 THEN CURRENT_TIMESTAMP END, COALESCE($4, false), CASE WHEN $5 THEN CURRENT_TIMESTAMP END, CASE WHEN $6 THEN CURRENT_TIMESTAMP END)
     ON CONFLICT (user_type, user_id) DO UPDATE SET
       completed_at = CASE WHEN $3 THEN COALESCE(mobile_onboarding.completed_at, CURRENT_TIMESTAMP) ELSE mobile_onboarding.completed_at END,
       skipped = COALESCE($4, mobile_onboarding.skipped),
       telegram_verified_at = CASE WHEN $5 THEN CURRENT_TIMESTAMP ELSE mobile_onboarding.telegram_verified_at END,
       instagram_opened_at = CASE WHEN $6 THEN COALESCE(mobile_onboarding.instagram_opened_at, CURRENT_TIMESTAMP) ELSE mobile_onboarding.instagram_opened_at END,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [userType, userId, Boolean(fields.completed), fields.skipped ?? null, Boolean(fields.telegram), Boolean(fields.instagram)],
  );

// @MOB-113 The Telegram account linked in the bot: a student's own chat, or for a parent the chat
// they linked with their own phone number (another parent of the same child does not count).
const telegramUserId = async (userType: string, userId: number) => {
  const row =
    userType === 'student'
      ? await one(
          `SELECT l.telegram_user_id FROM telegram_links l
           JOIN students s ON s.student_id = l.student_id
           WHERE l.active AND l.role = 'student' AND l.telegram_user_id IS NOT NULL
             AND (s.student_id = $1 OR s.main_student_id = $1)
           ORDER BY l.updated_at DESC NULLS LAST LIMIT 1`,
          [userId],
        )
      : await one(
          `SELECT l.telegram_user_id FROM telegram_links l
           JOIN parent_students ps ON ps.student_id = l.student_id
           JOIN parents p ON p.parent_id = ps.parent_id
           WHERE ps.parent_id = $1 AND l.active AND l.role = 'parent' AND l.telegram_user_id IS NOT NULL
             AND length(${LAST9('p.phone')}) = 9 AND ${LAST9('l.phone')} = ${LAST9('p.phone')}
           ORDER BY l.updated_at DESC NULLS LAST LIMIT 1`,
          [userId],
        );
  return row ? Number(row.telegram_user_id) : null;
};

// Students a consent can be about: the student themself, or each of a parent's children. Each
// comes with the answer in force.
const consentSubjects = (userType: string, userId: number, kind: string) =>
  query(
    `SELECT s.student_id, s.first_name, s.last_name, s.date_of_birth,
            c.granted, c.created_at AS answered_at, c.given_by_type
     FROM students s
     LEFT JOIN LATERAL (
       SELECT granted, created_at, given_by_type FROM mobile_consents
       WHERE student_id = s.student_id AND kind = $2 ORDER BY created_at DESC, consent_id DESC LIMIT 1
     ) c ON true
     WHERE s.deleted_at IS NULL AND s.main_student_id IS NULL
       AND ${userType === 'student' ? 's.student_id = $1' : 's.student_id IN (SELECT student_id FROM parent_students WHERE parent_id = $1)'}
     ORDER BY s.first_name, s.student_id`,
    [userId, kind],
  );

const addConsent = (consent: { studentId: number; kind: string; granted: boolean; byType: string; byId: number }) =>
  one(
    `INSERT INTO mobile_consents (student_id, kind, granted, given_by_type, given_by_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING consent_id, student_id, kind, granted, created_at`,
    [consent.studentId, consent.kind, consent.granted, consent.byType, consent.byId],
  );

// An Instagram link the admins added under official links, if any.
const instagramLink = () =>
  one(`SELECT url FROM mobile_links WHERE is_active AND url ILIKE '%instagram.com%' ORDER BY sort_order, link_id LIMIT 1`).then(
    (row: any) => row?.url ?? null,
  );

module.exports = { getState, saveState, telegramUserId, consentSubjects, addConsent, instagramLink };

export {};
