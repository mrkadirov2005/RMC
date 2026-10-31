const pool = require('../../../db/pool');

const query = (text: string, params: any[] = []) => pool.query(text, params).then((r: any) => r.rows);

// Centers and groups a user belongs to: a student's own records, or every record of a parent's
// children. Content is filtered by these.
const audienceOf = async (userType: string, userId: number) => {
  const rows =
    userType === 'student'
      ? await query(
          `SELECT DISTINCT center_id, class_id FROM students
           WHERE (student_id = $1 OR main_student_id = $1) AND deleted_at IS NULL`,
          [userId],
        )
      : await query(
          `SELECT DISTINCT s.center_id, s.class_id FROM parent_students ps
           JOIN students s ON (s.student_id = ps.student_id OR s.main_student_id = ps.student_id) AND s.deleted_at IS NULL
           WHERE ps.parent_id = $1`,
          [userId],
        );
  const centerIds = Array.from(new Set(rows.map((r: any) => Number(r.center_id)).filter(Boolean))) as number[];
  const classIds = Array.from(new Set(rows.map((r: any) => Number(r.class_id)).filter(Boolean))) as number[];
  return { centerIds, classIds };
};

// @MOB-060
const linksFor = (centerIds: number[]) =>
  query(
    `SELECT link_id, title, url, icon FROM mobile_links
     WHERE is_active AND (center_id IS NULL OR center_id = ANY($1::int[]))
     ORDER BY sort_order, link_id`,
    [centerIds],
  );

// @MOB-061
const announcementsFor = async (role: string, centerIds: number[], classIds: number[], limit: number, offset: number) => {
  const where = `deleted_at IS NULL AND published_at <= CURRENT_TIMESTAMP AND center_id = ANY($1::int[])
    AND (audience = 'all' OR audience = $2) AND (class_id IS NULL OR class_id = ANY($3::int[]))`;
  const [items, count] = await Promise.all([
    query(
      `SELECT announcement_id, title, body, audience, class_id, published_at FROM mobile_announcements
       WHERE ${where} ORDER BY published_at DESC, announcement_id DESC LIMIT $4 OFFSET $5`,
      [centerIds, role, classIds, limit, offset],
    ),
    query(`SELECT COUNT(*)::int AS total FROM mobile_announcements WHERE ${where}`, [centerIds, role, classIds]),
  ]);
  return { items, total: count[0]?.total ?? 0 };
};

// @MOB-062 Current version of each policy, and whether this user accepted it.
const policiesFor = (centerIds: number[], userType: string, userId: number) =>
  query(
    `SELECT p.policy_id, p.title, p.current_version AS version, v.body, v.requires_acceptance, v.published_at,
            (a.accepted_at IS NOT NULL) AS accepted, a.accepted_at
     FROM mobile_policies p
     JOIN mobile_policy_versions v ON v.policy_id = p.policy_id AND v.version = p.current_version
     LEFT JOIN mobile_policy_acceptances a ON a.policy_id = p.policy_id AND a.version = p.current_version AND a.user_type = $2 AND a.user_id = $3
     WHERE p.is_active AND (p.center_id IS NULL OR p.center_id = ANY($1::int[]))
     ORDER BY p.sort_order, p.policy_id`,
    [centerIds, userType, userId],
  );

const acceptPolicy = (policyId: number, version: number, userType: string, userId: number) =>
  query(
    `INSERT INTO mobile_policy_acceptances (policy_id, version, user_type, user_id) VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [policyId, version, userType, userId],
  );

// @MOB-063
const createHelpRequest = async (r: { centerId: number | null; userType: string; userId: number; studentId: number | null; kind: string; message: string }) =>
  (
    await query(
      `INSERT INTO mobile_help_requests (center_id, user_type, user_id, student_id, kind, message)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING request_id, kind, message, status, response, created_at, updated_at`,
      [r.centerId, r.userType, r.userId, r.studentId, r.kind, r.message],
    )
  )[0];

const helpRequestsOf = (userType: string, userId: number) =>
  query(
    `SELECT request_id, kind, message, status, response, created_at, updated_at, resolved_at
     FROM mobile_help_requests WHERE user_type = $1 AND user_id = $2 ORDER BY request_id DESC LIMIT 100`,
    [userType, userId],
  );

// ---------------- Admin (web panel) ----------------
const centerFilter = (centerId: number | null, column = 'center_id', index = 1) =>
  centerId ? `(${column} = $${index} OR ${column} IS NULL)` : 'TRUE';

// @MOB-160
const adminListLinks = (centerId: number | null) =>
  query(`SELECT * FROM mobile_links WHERE ${centerFilter(centerId)} ORDER BY sort_order, link_id`, centerId ? [centerId] : []);

const adminCreateLink = async (l: any) =>
  (
    await query(
      `INSERT INTO mobile_links (center_id, title, url, icon, sort_order, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [l.center_id, l.title, l.url, l.icon ?? null, l.sort_order ?? 0, l.is_active ?? true],
    )
  )[0];

// A center admin may change only their own center's links; global ones belong to the owner.
const adminUpdateLink = async (id: number, centerId: number | null, l: any) =>
  (
    await query(
      `UPDATE mobile_links SET title = COALESCE($3, title), url = COALESCE($4, url), icon = COALESCE($5, icon),
              sort_order = COALESCE($6, sort_order), is_active = COALESCE($7, is_active), updated_at = CURRENT_TIMESTAMP
       WHERE link_id = $1 AND ($2::int IS NULL OR center_id = $2) RETURNING *`,
      [id, centerId, l.title ?? null, l.url ?? null, l.icon ?? null, l.sort_order ?? null, l.is_active ?? null],
    )
  )[0] || null;

const adminDeleteLink = async (id: number, centerId: number | null) =>
  (await query('DELETE FROM mobile_links WHERE link_id = $1 AND ($2::int IS NULL OR center_id = $2) RETURNING link_id', [id, centerId]))[0] || null;

// @MOB-161
const adminListAnnouncements = (centerId: number | null) =>
  query(
    `SELECT a.*, c.class_name FROM mobile_announcements a LEFT JOIN classes c ON c.class_id = a.class_id
     WHERE a.deleted_at IS NULL AND ($1::int IS NULL OR a.center_id = $1) ORDER BY a.published_at DESC, a.announcement_id DESC LIMIT 200`,
    [centerId],
  );

const adminCreateAnnouncement = async (a: any) =>
  (
    await query(
      `INSERT INTO mobile_announcements (center_id, title, body, audience, class_id, send_push, created_by_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [a.center_id, a.title, a.body, a.audience, a.class_id ?? null, Boolean(a.send_push), a.created_by_name ?? null],
    )
  )[0];

const adminDeleteAnnouncement = async (id: number, centerId: number | null) =>
  (
    await query(
      `UPDATE mobile_announcements SET deleted_at = CURRENT_TIMESTAMP
       WHERE announcement_id = $1 AND deleted_at IS NULL AND ($2::int IS NULL OR center_id = $2) RETURNING announcement_id`,
      [id, centerId],
    )
  )[0] || null;

// @MOB-161 Queues the announcement for every student and parent it targets, skipping users who
// turned announcements off. Returns how many messages were queued.
const enqueueAnnouncement = async (a: any) => {
  const studentRows = await query(
    `WITH targets AS (
       SELECT DISTINCT COALESCE(s.main_student_id, s.student_id) AS main_id, s.student_id
       FROM students s
       WHERE s.center_id = $1 AND s.deleted_at IS NULL AND s.status = 'Active' AND ($2::int IS NULL OR s.class_id = $2)
     ),
     recipients AS (
       SELECT 'student'::text AS user_type, main_id AS user_id FROM targets WHERE $3 IN ('all', 'student')
       UNION
       SELECT 'parent'::text, ps.parent_id FROM parent_students ps JOIN targets t ON ps.student_id IN (t.student_id, t.main_id)
       WHERE $3 IN ('all', 'parent')
     )
     INSERT INTO mobile_notification_outbox (user_type, user_id, category, title, body, data, dedupe_key)
     SELECT r.user_type, r.user_id, 'announcements', $4, LEFT($5, 300), '{"url":"/announcements"}'::jsonb,
            'announcement:' || $6 || ':' || r.user_type || ':' || r.user_id
     FROM recipients r
     WHERE NOT EXISTS (
       SELECT 1 FROM mobile_notification_prefs p
       WHERE p.user_type = r.user_type AND p.user_id = r.user_id AND p.category = 'announcements' AND NOT p.enabled
     )
     ON CONFLICT (dedupe_key) DO NOTHING
     RETURNING outbox_id`,
    [a.center_id, a.class_id ?? null, a.audience, a.title, a.body, String(a.announcement_id)],
  );
  return studentRows.length;
};

// @MOB-162
const adminListPolicies = (centerId: number | null) =>
  query(
    `SELECT p.policy_id, p.center_id, p.title, p.sort_order, p.is_active, p.current_version, v.body, v.requires_acceptance, v.published_at,
            (SELECT COUNT(*)::int FROM mobile_policy_acceptances a WHERE a.policy_id = p.policy_id AND a.version = p.current_version) AS accepted_count
     FROM mobile_policies p JOIN mobile_policy_versions v ON v.policy_id = p.policy_id AND v.version = p.current_version
     WHERE ${centerFilter(centerId, 'p.center_id')} ORDER BY p.sort_order, p.policy_id`,
    centerId ? [centerId] : [],
  );

const adminCreatePolicy = async (p: any) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const policy = (
      await client.query(
        'INSERT INTO mobile_policies (center_id, title, sort_order) VALUES ($1, $2, $3) RETURNING policy_id, title, current_version',
        [p.center_id, p.title, p.sort_order ?? 0],
      )
    ).rows[0];
    await client.query(
      'INSERT INTO mobile_policy_versions (policy_id, version, body, requires_acceptance, published_by_name) VALUES ($1, 1, $2, $3, $4)',
      [policy.policy_id, p.body, p.requires_acceptance ?? true, p.published_by_name ?? null],
    );
    await client.query('COMMIT');
    return policy;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// @MOB-162 A new version replaces the text; earlier versions stay as history.
const adminPublishPolicyVersion = async (id: number, centerId: number | null, p: any) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const policy = (
      await client.query(
        `UPDATE mobile_policies SET current_version = current_version + 1, title = COALESCE($3, title), updated_at = CURRENT_TIMESTAMP
         WHERE policy_id = $1 AND ($2::int IS NULL OR center_id = $2) RETURNING policy_id, title, current_version`,
        [id, centerId, p.title ?? null],
      )
    ).rows[0];
    if (!policy) {
      await client.query('ROLLBACK');
      return null;
    }
    await client.query(
      'INSERT INTO mobile_policy_versions (policy_id, version, body, requires_acceptance, published_by_name) VALUES ($1, $2, $3, $4, $5)',
      [id, policy.current_version, p.body, p.requires_acceptance ?? true, p.published_by_name ?? null],
    );
    await client.query('COMMIT');
    return policy;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const adminPolicyVersions = (id: number) =>
  query('SELECT version, body, requires_acceptance, published_at, published_by_name FROM mobile_policy_versions WHERE policy_id = $1 ORDER BY version DESC', [id]);

// @MOB-164
const adminListHelpRequests = (centerId: number | null, status: string | null) =>
  query(
    `SELECT h.*, COALESCE(s.first_name || ' ' || s.last_name, p.first_name || ' ' || p.last_name) AS sender_name
     FROM mobile_help_requests h
     LEFT JOIN students s ON h.user_type = 'student' AND s.student_id = h.user_id
     LEFT JOIN parents p ON h.user_type = 'parent' AND p.parent_id = h.user_id
     WHERE ($1::int IS NULL OR h.center_id = $1) AND ($2::text IS NULL OR h.status = $2)
     ORDER BY h.request_id DESC LIMIT 300`,
    [centerId, status],
  );

const adminUpdateHelpRequest = async (id: number, centerId: number | null, u: any) =>
  (
    await query(
      `UPDATE mobile_help_requests
       SET status = COALESCE($3, status), response = COALESCE($4, response), handled_by_name = $5, updated_at = CURRENT_TIMESTAMP,
           resolved_at = CASE WHEN $3 = 'resolved' THEN CURRENT_TIMESTAMP ELSE resolved_at END
       WHERE request_id = $1 AND ($2::int IS NULL OR center_id = $2) RETURNING *`,
      [id, centerId, u.status ?? null, u.response ?? null, u.handled_by_name ?? null],
    )
  )[0] || null;

module.exports = {
  audienceOf,
  linksFor,
  announcementsFor,
  policiesFor,
  acceptPolicy,
  createHelpRequest,
  helpRequestsOf,
  adminListLinks,
  adminCreateLink,
  adminUpdateLink,
  adminDeleteLink,
  adminListAnnouncements,
  adminCreateAnnouncement,
  adminDeleteAnnouncement,
  enqueueAnnouncement,
  adminListPolicies,
  adminCreatePolicy,
  adminPublishPolicyVersion,
  adminPolicyVersions,
  adminListHelpRequests,
  adminUpdateHelpRequest,
};

export {};
