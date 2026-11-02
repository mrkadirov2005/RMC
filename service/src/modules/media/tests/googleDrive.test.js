describe('Google Drive storage', () => {
  const env = { ...process.env };
  let drive;
  beforeEach(() => {
    jest.resetModules();
    Object.assign(process.env, { GDRIVE_CLIENT_ID: 'cid', GDRIVE_CLIENT_SECRET: 'cs', GDRIVE_REFRESH_TOKEN: 'rt', GDRIVE_FOLDER_ID: 'folder1' });
    global.fetch = jest.fn();
    drive = require('../googleDrive');
  });
  afterEach(() => {
    process.env = { ...env };
    delete global.fetch;
  });

  const ok = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });

  // @MOB-055
  it('is configured only with all four values', () => {
    expect(drive.isConfigured()).toBe(true);
    delete process.env.GDRIVE_FOLDER_ID;
    expect(drive.isConfigured()).toBe(false);
  });

  it('uploads into the folder, opens it to anyone with the link and returns the direct link', async () => {
    fetch
      .mockResolvedValueOnce(ok({ access_token: 'AT', expires_in: 3600 }))
      .mockResolvedValueOnce(ok({ id: 'F1' }))
      .mockResolvedValueOnce(ok({ id: 'perm' }));
    const file = await drive.upload({ name: 'a.m4a', contentType: 'audio/mp4', data: Buffer.from('abc') });
    expect(file).toEqual({ id: 'F1', downloadUrl: 'https://drive.usercontent.google.com/download?id=F1&export=download&confirm=t' });

    const [tokenUrl, tokenInit] = fetch.mock.calls[0];
    expect(tokenUrl).toBe('https://oauth2.googleapis.com/token');
    expect(String(tokenInit.body)).toContain('refresh_token=rt');

    const [uploadUrl, uploadInit] = fetch.mock.calls[1];
    expect(uploadUrl).toContain('uploadType=multipart');
    expect(uploadInit.headers.Authorization).toBe('Bearer AT');
    const sent = uploadInit.body.toString();
    expect(sent).toContain('"parents":["folder1"]');
    expect(sent).toContain('abc');

    const [permUrl, permInit] = fetch.mock.calls[2];
    expect(permUrl).toContain('/files/F1/permissions');
    expect(JSON.parse(permInit.body)).toEqual({ role: 'reader', type: 'anyone' });
  });

  it('reuses the access token until it is about to expire', async () => {
    fetch.mockResolvedValueOnce(ok({ access_token: 'AT', expires_in: 3600 })).mockResolvedValue(ok({ id: 'F' }));
    await drive.upload({ name: 'a', contentType: 'image/png', data: Buffer.from('x') });
    await drive.upload({ name: 'b', contentType: 'image/png', data: Buffer.from('y') });
    expect(fetch.mock.calls.filter(([url]) => url.includes('oauth2')).length).toBe(1);
  });

  it('reports a failed token refresh', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: 'invalid_grant' }) });
    await expect(drive.upload({ name: 'a', contentType: 'image/png', data: Buffer.from('x') })).rejects.toThrow('invalid_grant');
  });
});
