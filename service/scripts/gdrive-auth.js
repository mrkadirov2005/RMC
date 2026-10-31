#!/usr/bin/env node
// @MOB-055 One-time setup for Google Drive storage. Run on your own computer (not the server):
//
//   GDRIVE_CLIENT_ID=... GDRIVE_CLIENT_SECRET=... node service/scripts/gdrive-auth.js
//
// It opens Google's sign-in page for the center's Google account, creates the "TEMURBEK SCHOOL
// uploads" folder in that account's Drive and prints the four lines to put in the server's .env.
// The client is an OAuth client of type "Desktop app" (Google Cloud Console → APIs & Services →
// Credentials), with the Drive API enabled. Publish the consent screen ("In production"):
// in "Testing" Google expires the refresh token after 7 days.

const http = require('http');
const crypto = require('crypto');
const { execFile } = require('child_process');

const clientId = process.env.GDRIVE_CLIENT_ID;
const clientSecret = process.env.GDRIVE_CLIENT_SECRET;
const folderName = process.env.GDRIVE_FOLDER_NAME || 'TEMURBEK SCHOOL uploads';
if (!clientId || !clientSecret) {
  console.error('Set GDRIVE_CLIENT_ID and GDRIVE_CLIENT_SECRET (OAuth client of type "Desktop app").');
  process.exit(1);
}

const state = crypto.randomBytes(16).toString('hex');
const server = http.createServer();

server.listen(0, '127.0.0.1', () => {
  const redirectUri = `http://127.0.0.1:${server.address().port}`;
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.file',
    access_type: 'offline',
    prompt: 'consent',
    state,
  })}`;
  console.log(`Sign in with the center's Google account:\n\n${authUrl}\n`);
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
  execFile(opener, [authUrl], () => {});

  server.on('request', async (req, res) => {
    const params = new URL(req.url, redirectUri).searchParams;
    if (!params.get('code')) {
      res.end();
      return;
    }
    if (params.get('state') !== state) {
      res.end('State mismatch, run the script again.');
      return;
    }
    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code: params.get('code'), client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
      });
      const tokens = await tokenResponse.json();
      if (!tokens.refresh_token) throw new Error(`No refresh token: ${JSON.stringify(tokens)}`);
      const folderResponse = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder' }),
      });
      const folder = await folderResponse.json();
      if (!folder.id) throw new Error(`Could not create the folder: ${JSON.stringify(folder)}`);
      res.end('Done. You can close this tab and go back to the terminal.');
      console.log('Add these lines to ~/RMC/.env on the server, then rebuild the backend:\n');
      console.log(`GDRIVE_CLIENT_ID=${clientId}`);
      console.log(`GDRIVE_CLIENT_SECRET=${clientSecret}`);
      console.log(`GDRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log(`GDRIVE_FOLDER_ID=${folder.id}`);
    } catch (error) {
      res.end('Failed, see the terminal.');
      console.error(error.message || error);
      process.exitCode = 1;
    } finally {
      server.close();
    }
  });
});
