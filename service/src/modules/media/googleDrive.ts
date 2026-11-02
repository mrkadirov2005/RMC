// @MOB-055 Google Drive storage for uploaded files (owner's decision: Drive with direct download links
// instead of S3). Uses the center's own Google account through an OAuth refresh token
// (scripts/gdrive-auth.js prints the values). With the drive.file scope the backend only sees the
// files it created itself.

type DriveFile = { id: string; downloadUrl: string };

const config = () => ({
  clientId: String(process.env.GDRIVE_CLIENT_ID || '').trim(),
  clientSecret: String(process.env.GDRIVE_CLIENT_SECRET || '').trim(),
  refreshToken: String(process.env.GDRIVE_REFRESH_TOKEN || '').trim(),
  folderId: String(process.env.GDRIVE_FOLDER_ID || '').trim(),
});

const isConfigured = () => {
  const c = config();
  return Boolean(c.clientId && c.clientSecret && c.refreshToken && c.folderId);
};

// The address that returns the file itself (the older uc?export=download one can answer with a
// warning page instead).
const directLink = (fileId: string) => `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`;

let cachedToken: { value: string; expiresAt: number } | null = null;

const accessToken = async (now = Date.now()) => {
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) return cachedToken.value;
  const c = config();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: c.clientId, client_secret: c.clientSecret, refresh_token: c.refreshToken, grant_type: 'refresh_token' }),
  });
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) throw new Error(`Google token refresh failed: ${response.status} ${body.error || ''}`.trim());
  cachedToken = { value: body.access_token, expiresAt: now + Number(body.expires_in || 3600) * 1000 };
  return cachedToken.value;
};

const driveFetch = async (url: string, init: RequestInit) => {
  const token = await accessToken();
  const response = await fetch(url, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    if (response.status === 401) cachedToken = null;
    const text = await response.text().catch(() => '');
    throw new Error(`Google Drive ${init.method || 'GET'} failed: ${response.status} ${text.slice(0, 200)}`);
  }
  return response;
};

// Uploads the bytes into the folder and opens the file to anyone with the link, so the app and the
// web panel can play or open it directly.
const upload = async ({ name, contentType, data }: { name: string; contentType: string; data: Buffer }): Promise<DriveFile> => {
  const boundary = `rmc${Date.now().toString(16)}`;
  const metadata = JSON.stringify({ name, parents: [config().folderId], mimeType: contentType });
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`),
    data,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const created: any = await (
    await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    })
  ).json();
  await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(created.id)}/permissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });
  return { id: created.id, downloadUrl: directLink(created.id) };
};

const remove = async (fileId: string) => {
  await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, { method: 'DELETE' });
};

const resetForTests = () => {
  cachedToken = null;
};

module.exports = { isConfigured, upload, remove, directLink, resetForTests };

export {};
