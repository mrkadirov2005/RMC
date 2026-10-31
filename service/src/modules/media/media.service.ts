const crypto = require('crypto');
const pool = require('../../db/pool');
const storage = require('./mediaStorage');
const drive = require('./googleDrive');

// @MOB-055 What may be uploaded, by kind: allowed types and the largest size.
const MB = 1024 * 1024;
const KINDS: Record<string, { types: Record<string, string>; maxBytes: number }> = {
  audio: {
    types: { 'audio/mp4': 'm4a', 'audio/m4a': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac', 'audio/mpeg': 'mp3', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/x-wav': 'wav' },
    maxBytes: 20 * MB,
  },
  image: { types: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' }, maxBytes: 10 * MB },
  pdf: { types: { 'application/pdf': 'pdf' }, maxBytes: 15 * MB },
};
const PURPOSES = ['homework'] as const;
const UPLOAD_URL_SECONDS = 15 * 60;
const DOWNLOAD_URL_SECONDS = 5 * 60;
const MAX_PENDING_PER_HOUR = 60;

const query = (text: string, params: any[] = []) => pool.query(text, params).then((r: any) => r.rows);
const one = (text: string, params: any[] = []) => query(text, params).then((rows: any[]) => rows[0] || null);

const kindOf = (contentType: string) => Object.keys(KINDS).find((k) => contentType in KINDS[k].types) || null;
const limits = () => Object.fromEntries(Object.entries(KINDS).map(([k, v]) => [k, { types: Object.keys(v.types), max_bytes: v.maxBytes }]));

const publicRow = (row: any) => ({
  media_id: row.media_id,
  kind: row.kind,
  content_type: row.content_type,
  size_bytes: Number(row.size_bytes),
  file_name: row.file_name,
  status: row.status,
  created_at: row.created_at,
});

// @MOB-055 Step 1: checks type and size and returns a URL the app uploads the file to.
const createUpload = async (owner: { type: string; id: number }, body: any, baseUrl: string) => {
  const contentType = String(body?.content_type || '').toLowerCase().trim();
  const size = Number(body?.size_bytes);
  const purpose = String(body?.purpose || '');
  if (!(PURPOSES as readonly string[]).includes(purpose)) return { kind: 'bad_purpose' as const };
  const kind = kindOf(contentType);
  if (!kind) return { kind: 'bad_type' as const, limits: limits() };
  if (!Number.isInteger(size) || size <= 0) return { kind: 'bad_size' as const };
  if (size > KINDS[kind].maxBytes) return { kind: 'too_large' as const, max_bytes: KINDS[kind].maxBytes };
  const recent = await one(
    `SELECT COUNT(*)::int AS count FROM media_files WHERE owner_type = $1 AND owner_id = $2 AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'`,
    [owner.type, owner.id],
  );
  if (Number(recent?.count || 0) >= MAX_PENDING_PER_HOUR) return { kind: 'too_many' as const };

  const key = `${purpose}/${owner.type}-${owner.id}/${crypto.randomUUID()}.${KINDS[kind].types[contentType]}`;
  const fileName = body?.file_name ? String(body.file_name).slice(0, 200) : null;
  const row = await one(
    `INSERT INTO media_files (owner_type, owner_id, purpose, kind, content_type, size_bytes, file_name, storage_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [owner.type, owner.id, purpose, kind, contentType, size, fileName, key],
  );
  const url = await storage.presignPut({ key, contentType, size, expiresSeconds: UPLOAD_URL_SECONDS, baseUrl });
  return {
    kind: 'ok' as const,
    media: publicRow(row),
    upload: { url, method: 'PUT', headers: { 'Content-Type': contentType }, expires_in: UPLOAD_URL_SECONDS },
  };
};

const ownMedia = (owner: { type: string; id: number }, mediaId: number) =>
  one(`SELECT * FROM media_files WHERE media_id = $1 AND owner_type = $2 AND owner_id = $3`, [mediaId, owner.type, owner.id]);

// @MOB-055 Step 2: after the upload, checks the stored size. A file that is missing waits for a
// retry; one bigger than announced (or over the limit) is deleted and rejected.
const completeUpload = async (owner: { type: string; id: number }, mediaId: number) => {
  const row = await ownMedia(owner, mediaId);
  if (!row) return { kind: 'not_found' as const };
  if (row.status === 'uploaded') return { kind: 'ok' as const, media: publicRow(row) };
  if (row.status === 'rejected') return { kind: 'rejected' as const };
  const size = await storage.sizeOf(row.storage_key);
  if (size == null) return { kind: 'missing' as const };
  if (size > Number(row.size_bytes) || size > KINDS[row.kind].maxBytes) {
    await storage.remove(row.storage_key);
    await query(`UPDATE media_files SET status = 'rejected' WHERE media_id = $1`, [mediaId]);
    return { kind: 'rejected' as const };
  }
  const updated = await one(
    `UPDATE media_files SET status = 'uploaded', size_bytes = $2, uploaded_at = CURRENT_TIMESTAMP WHERE media_id = $1 RETURNING *`,
    [mediaId, size],
  );
  await moveToDrive(updated);
  return { kind: 'ok' as const, media: publicRow(updated) };
};

// @MOB-055 Moves a checked file from the backend to Google Drive and keeps its direct link. When
// Drive is not configured or fails, the file stays on the backend (served by signed links) and
// syncToDrive tries again later.
const moveToDrive = async (row: any) => {
  if (!drive.isConfigured() || row.drive_file_id) return false;
  try {
    const data = await storage.readLocal(row.storage_key);
    const name = `${row.storage_key.replace(/\//g, '_')}`;
    const file = await drive.upload({ name, contentType: row.content_type, data });
    await query(`UPDATE media_files SET drive_file_id = $2, download_url = $3 WHERE media_id = $1`, [row.media_id, file.id, file.downloadUrl]);
    await storage.remove(row.storage_key);
    return true;
  } catch (error: any) {
    console.error(`[media] Google Drive upload failed for media ${row.media_id}: ${error?.message || error}`);
    return false;
  }
};

// @MOB-055 Retries files left on the backend (Drive was down or not configured yet).
const syncToDrive = async (limit = 20) => {
  if (!drive.isConfigured()) return 0;
  const rows = await query(
    `SELECT * FROM media_files WHERE status = 'uploaded' AND drive_file_id IS NULL ORDER BY media_id LIMIT $1`,
    [limit],
  );
  let moved = 0;
  for (const row of rows) {
    // One at a time keeps memory low on the small server.
    if (await moveToDrive(row)) moved += 1;
  }
  return moved;
};

// @MOB-055 The Drive link once the file is there (it does not expire), otherwise a signed link to
// the backend copy.
const downloadUrl = async (row: any, baseUrl: string) =>
  row.download_url
    ? { ...publicRow(row), url: row.download_url, expires_in: null }
    : {
        ...publicRow(row),
        url: await storage.presignGet({ key: row.storage_key, contentType: row.content_type, expiresSeconds: DOWNLOAD_URL_SECONDS, baseUrl, fileName: row.file_name }),
        expires_in: DOWNLOAD_URL_SECONDS,
      };

// @MOB-055 A signed link to the owner's own uploaded file.
const ownDownload = async (owner: { type: string; id: number }, mediaId: number, baseUrl: string) => {
  const row = await ownMedia(owner, mediaId);
  if (!row || row.status !== 'uploaded') return null;
  return downloadUrl(row, baseUrl);
};

// @MOB-143 Files a homework answer points to: they must be the student's own finished uploads.
// Returns the ids that are not, so the submission can be refused.
const invalidOwnMedia = async (studentId: number, ids: number[]) => {
  if (!ids.length) return [];
  const rows = await query(
    `SELECT media_id FROM media_files WHERE media_id = ANY($1::int[]) AND owner_type = 'student' AND owner_id = $2 AND status = 'uploaded'`,
    [ids, studentId],
  );
  const ok = new Set(rows.map((r: any) => Number(r.media_id)));
  return ids.filter((id) => !ok.has(id));
};

const attachToAssignment = (studentId: number, ids: number[], assignmentId: number) =>
  ids.length
    ? query(`UPDATE media_files SET assignment_id = $3 WHERE media_id = ANY($1::int[]) AND owner_type = 'student' AND owner_id = $2`, [ids, studentId, assignmentId])
    : Promise.resolve([]);

const byId = (mediaId: number) => one(`SELECT * FROM media_files WHERE media_id = $1`, [mediaId]);

// Details of files for display (teacher review, the student's own answer).
const describe = async (ids: number[]) => {
  if (!ids.length) return [];
  const rows = await query(`SELECT * FROM media_files WHERE media_id = ANY($1::int[]) AND status = 'uploaded'`, [ids]);
  return rows.map(publicRow);
};

// @MOB-055 Started with the server: every 10 minutes, files still on the backend go to Drive.
const startDriveSync = () => {
  if (!drive.isConfigured()) {
    console.log('[media] Google Drive is not configured; uploaded files stay on the backend.');
    return null;
  }
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await syncToDrive();
    } catch (error: any) {
      console.error('[media] Drive sync failed:', error?.message || error);
    } finally {
      running = false;
    }
  }, 10 * 60 * 1000);
  timer.unref?.();
  return timer;
};

module.exports = { startDriveSync, KINDS, limits, kindOf, createUpload, completeUpload, moveToDrive, syncToDrive, ownDownload, downloadUrl, invalidOwnMedia, attachToAssignment, byId, describe };

export {};
