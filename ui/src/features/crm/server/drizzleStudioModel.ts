// Drizzle Studio runs on the server bound to 127.0.0.1:4983 and is reached through
// an SSH tunnel, so from the owner's browser it always lives at localhost.
export const DRIZZLE_STUDIO_PORT = 4983;
export const DRIZZLE_STUDIO_SERVER_URL = `http://localhost:${DRIZZLE_STUDIO_PORT}/`;
export const DRIZZLE_STUDIO_APP_URL = 'https://local.drizzle.studio/';
export const DRIZZLE_STUDIO_TUNNEL_COMMAND = `ssh -N -L ${DRIZZLE_STUDIO_PORT}:127.0.0.1:${DRIZZLE_STUDIO_PORT} ec2-user@YOUR-SERVER`;

export type StudioConnection = 'checking' | 'connected' | 'offline';

// Sends the same "init" request the Studio page makes, so a success means the
// embedded Studio will be able to connect too.
export const probeDrizzleStudio = async (fetcher: typeof fetch = fetch, timeoutMs = 3000): Promise<boolean> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(DRIZZLE_STUDIO_SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'init' }),
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const body = await response.json();
    return Boolean(body && typeof body === 'object' && 'dialect' in body);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};
