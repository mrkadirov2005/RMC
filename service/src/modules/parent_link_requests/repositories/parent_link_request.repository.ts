const crypto = require('crypto');
const pool = require('../../../db/pool');
const { hashPassword } = require('../../../shared/password');

// Requests from the Telegram bot by parents whose phone isn't saved on the child. Approving makes
// the parent a real parent of the child (parents + parent_students) and lets their chat follow the
// child (telegram_links), then tells them in the bot.

const lastNineDigits = (value: unknown) => String(value || '').replace(/\D/g, '').slice(-9);
const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const list = async (centerId?: number, status?: string) => {
  const params: any[] = [];
  const where: string[] = [];
  if (centerId) { params.push(centerId); where.push(`r.center_id = $${params.length}`); }
  if (status) { params.push(status); where.push(`LOWER(r.status) = LOWER($${params.length})`); }
  const result = await pool.query(
    `SELECT r.request_id, r.center_id, r.student_id, r.telegram_chat_id, r.telegram_username, r.parent_name,
            r.parent_phone, r.child_query, r.status, r.parent_id, r.decided_at, r.created_at,
            s.first_name AS student_first_name, s.last_name AS student_last_name,
            s.phone AS student_phone, s.parent_name AS saved_parent_name, s.parent_phone AS saved_parent_phone,
            c.class_name
     FROM parent_link_requests r
     LEFT JOIN students s ON s.student_id = r.student_id
     LEFT JOIN classes c ON c.class_id = s.class_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY (r.status = 'Pending') DESC, r.created_at DESC, r.request_id DESC
     LIMIT 500`,
    params
  );
  return result.rows;
};

const enqueueChatMessage = (client: any, request: any, kind: string, text: string, decidedById: number | null) =>
  client.query(
    `INSERT INTO telegram_outbox (center_id, student_id, kind, text, created_by_id, created_by_type, telegram_chat_id)
     VALUES ($1, $2, $3, $4, $5, 'superuser', $6)`,
    [request.center_id, request.student_id, kind, text, decidedById, request.telegram_chat_id]
  );

/** The parent with this phone in the center, or a new one (they sign in through the bot only). */
const findOrCreateParent = async (client: any, request: any) => {
  const digits = lastNineDigits(request.parent_phone);
  if (digits.length === 9) {
    const existing = await client.query(
      `SELECT parent_id FROM parents
       WHERE center_id = $1 AND RIGHT(regexp_replace(COALESCE(phone, ''), '\\D', '', 'g'), 9) = $2
       ORDER BY parent_id LIMIT 1`,
      [request.center_id, digits]
    );
    if (existing.rows[0]) return Number(existing.rows[0].parent_id);
  }
  const [firstName, ...rest] = String(request.parent_name || 'Ota-ona').trim().split(/\s+/);
  const username = `tg_${request.telegram_user_id || request.telegram_chat_id}_${request.center_id}`;
  const inserted = await client.query(
    `INSERT INTO parents (center_id, first_name, last_name, phone, username, password_hash, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'Active')
     ON CONFLICT (username) DO UPDATE SET phone = COALESCE(parents.phone, EXCLUDED.phone), updated_at = CURRENT_TIMESTAMP
     RETURNING parent_id`,
    // No one knows this password: the parent uses the bot, and an admin can set a real one later.
    [request.center_id, firstName || 'Ota-ona', rest.join(' '), request.parent_phone, username, hashPassword(crypto.randomBytes(24).toString('hex'))]
  );
  return Number(inserted.rows[0].parent_id);
};

const lockPending = async (client: any, id: number, centerId?: number) => {
  const params: any[] = [id];
  const centerFilter = centerId ? `AND r.center_id = $${params.push(centerId)}` : '';
  const result = await client.query(
    `SELECT r.*, s.first_name AS student_first_name, s.last_name AS student_last_name
     FROM parent_link_requests r
     JOIN students s ON s.student_id = r.student_id
     WHERE r.request_id = $1 ${centerFilter}
     FOR UPDATE OF r`,
    params
  );
  return result.rows[0] || null;
};

const inTransaction = async (work: (client: any) => Promise<any>) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await work(client);
    await client.query('COMMIT');
    return out;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    throw error;
  } finally {
    client.release();
  }
};

const approve = (id: number, centerId: number | undefined, decidedById: number | null) => inTransaction(async (client) => {
  const request = await lockPending(client, id, centerId);
  if (!request) return { error: 'not_found' as const };
  if (request.status !== 'Pending') return { error: 'already_decided' as const, status: request.status };

  const parentId = await findOrCreateParent(client, request);
  await client.query(
    `INSERT INTO parent_students (parent_id, student_id, center_id, relationship, is_primary)
     VALUES ($1, $2, $3, 'Parent', false)
     ON CONFLICT (parent_id, student_id) DO NOTHING`,
    [parentId, request.student_id, request.center_id]
  );
  await client.query(
    `INSERT INTO telegram_links (center_id, student_id, telegram_chat_id, telegram_user_id, role, phone, active)
     VALUES ($1, $2, $3, $4, 'parent', $5, true)
     ON CONFLICT (telegram_chat_id, student_id)
     DO UPDATE SET active = true, role = 'parent', phone = COALESCE(EXCLUDED.phone, telegram_links.phone), updated_at = CURRENT_TIMESTAMP`,
    [request.center_id, request.student_id, request.telegram_chat_id, request.telegram_user_id, request.parent_phone]
  );
  const updated = await client.query(
    `UPDATE parent_link_requests
     SET status = 'Approved', parent_id = $2, decided_by_id = $3, decided_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE request_id = $1 RETURNING *`,
    [id, parentId, decidedById]
  );
  const childName = [request.student_first_name, request.student_last_name].filter(Boolean).join(' ');
  await enqueueChatMessage(client, request, 'parent_link_approved', [
    '✅ <b>So‘rovingiz tasdiqlandi</b>',
    '',
    `Farzandingiz ulandi: <b>${escapeHtml(childName)}</b>`,
    'Endi har bir darsdan keyin natijalar shu yerga keladi. Menyu uchun /start bosing.',
  ].join('\n'), decidedById);
  return { request: updated.rows[0], parent_id: parentId };
});

const reject = (id: number, centerId: number | undefined, decidedById: number | null) => inTransaction(async (client) => {
  const request = await lockPending(client, id, centerId);
  if (!request) return { error: 'not_found' as const };
  if (request.status !== 'Pending') return { error: 'already_decided' as const, status: request.status };
  const updated = await client.query(
    `UPDATE parent_link_requests
     SET status = 'Rejected', decided_by_id = $2, decided_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE request_id = $1 RETURNING *`,
    [id, decidedById]
  );
  await enqueueChatMessage(client, request, 'parent_link_rejected', [
    '❌ <b>So‘rovingiz tasdiqlanmadi</b>',
    '',
    'Farzandingizni ulash uchun markaz administratoriga murojaat qiling.',
  ].join('\n'), decidedById);
  return { request: updated.rows[0] };
});

module.exports = { list, approve, reject };

export {};
