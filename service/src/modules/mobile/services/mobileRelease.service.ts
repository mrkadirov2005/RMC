const pool = require('../../../db/pool');

const query = (text: string, params: any[] = []) => pool.query(text, params).then((r: any) => r.rows);
const one = (text: string, params: any[] = []) => query(text, params).then((rows: any[]) => rows[0] || null);

const VERSION = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;

// "1.2.10" > "1.2.9"; anything that is not x.y.z counts as 0.0.0.
const parts = (v: string) => (VERSION.test(String(v || '')) ? String(v).split('.').map(Number) : [0, 0, 0]);
const compareVersions = (a: string, b: string) => {
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
};

// @MOB-172 A Google Drive "share" link opens a preview page; the app and the website need the file
// itself, so share links are turned into direct download links. Drive's older uc?export=download
// address shows a "can't scan this file" page for APKs; drive.usercontent.google.com with
// confirm=t returns the file.
const directDownloadUrl = (url: string) => {
  const text = String(url || '').trim();
  const match = text.match(/^https:\/\/drive\.google\.com\/(?:file\/d\/([\w-]+)|open\?id=([\w-]+))/);
  const id = match?.[1] || match?.[2];
  return id ? `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t` : text;
};

const latest = () => one(`SELECT * FROM mobile_app_releases WHERE platform = 'android' ORDER BY release_id DESC LIMIT 1`);
const list = () => query(`SELECT * FROM mobile_app_releases ORDER BY release_id DESC LIMIT 50`);

// @MOB-172 Publishes a new version. It must be newer than the current one; min_version (default: the
// previous minimum) says which installed versions still work.
const publish = async (body: any, actorName: string | null) => {
  const version = String(body?.version || '').trim();
  const downloadUrl = directDownloadUrl(body?.download_url);
  const notes = body?.notes ? String(body.notes).trim().slice(0, 2000) : null;
  if (!VERSION.test(version)) return { kind: 'bad_version' as const };
  if (!/^https:\/\/\S+$/.test(downloadUrl)) return { kind: 'bad_url' as const };
  const current = await latest();
  if (current && compareVersions(version, current.version) <= 0) return { kind: 'not_newer' as const, current: current.version };
  const minVersion = String(body?.min_version || current?.min_version || version).trim();
  if (!VERSION.test(minVersion) || compareVersions(minVersion, version) > 0) return { kind: 'bad_min_version' as const };
  const release = await one(
    `INSERT INTO mobile_app_releases (version, min_version, download_url, notes, created_by_name) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [version, minVersion, downloadUrl, notes, actorName],
  );
  return { kind: 'ok' as const, release };
};

// @MOB-175 What the app checks on start. MOBILE_MIN_APP_VERSION on the server can raise the minimum
// in an emergency without publishing a version.
const appConfig = async (envMinimum = process.env.MOBILE_MIN_APP_VERSION || '1.0.0') => {
  const release = await latest();
  const minimum = release && compareVersions(release.min_version, envMinimum) > 0 ? release.min_version : envMinimum;
  return {
    api_version: 'v1',
    min_app_version: minimum,
    latest_version: release?.version ?? null,
    download_url: release?.download_url ?? null,
    release_notes: release?.notes ?? null,
    released_at: release?.created_at ?? null,
  };
};

module.exports = { compareVersions, directDownloadUrl, latest, list, publish, appConfig };

export {};
