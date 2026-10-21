// SMS Gateway for Android (sms-gate.app): the center's phone, with its own SIM card, sends what we
// hand it. Cloud mode, so the server reaches the phone over the internet wherever it is.
// Set SMS_GATEWAY_USERNAME and SMS_GATEWAY_PASSWORD from the app's "Cloud server" screen.

const DEFAULT_URL = 'https://api.sms-gate.app/3rdparty/v1';
const TIMEOUT_MS = 15000;

const config = () => ({
  url: String(process.env.SMS_GATEWAY_URL || DEFAULT_URL).replace(/\/+$/, ''),
  username: String(process.env.SMS_GATEWAY_USERNAME || '').trim(),
  password: String(process.env.SMS_GATEWAY_PASSWORD || '').trim(),
  simNumber: Number(process.env.SMS_GATEWAY_SIM_NUMBER || 0) || null,
});

const isConfigured = () => {
  const { username, password } = config();
  return Boolean(username && password);
};

class GatewayError extends Error {
  transient: boolean;
  constructor(message: string, transient: boolean) {
    super(message);
    this.transient = transient;
  }
}

const request = async (method: string, path: string, body?: unknown) => {
  const { url, username, password } = config();
  let response: any;
  try {
    response = await fetch(`${url}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error: any) {
    throw new GatewayError(`SMS gateway unreachable: ${error?.message || error}`, true);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.message || data?.error || `HTTP ${response.status}`;
    // Rate limited or the gateway's own trouble: try later. Anything else (bad login, bad number) will not fix itself.
    throw new GatewayError(`SMS gateway: ${detail}`, response.status === 429 || response.status >= 500);
  }
  return data;
};

/** Hands one message to the phone. `ttlSeconds`: the phone drops it if it cannot send in time. */
const sendSms = async (phone: string, text: string, ttlSeconds: number) => {
  const { simNumber } = config();
  const data = await request('POST', '/message', {
    textMessage: { text },
    phoneNumbers: [phone],
    ttl: Math.min(24 * 60 * 60, Math.max(60, Math.round(ttlSeconds))),
    withDeliveryReport: true,
    ...(simNumber ? { simNumber } : {}),
  });
  return { id: data?.id ? String(data.id) : null, state: String(data?.state || 'Pending') };
};

/** What the phone reports for a message: Pending, Processed, Sent, Delivered or Failed. */
const getSmsState = async (gatewayId: string) => {
  const data = await request('GET', `/message/${encodeURIComponent(gatewayId)}`);
  const recipient = Array.isArray(data?.recipients) ? data.recipients[0] : null;
  return { state: String(data?.state || ''), error: recipient?.error ? String(recipient.error) : null };
};

module.exports = { isConfigured, sendSms, getSmsState, GatewayError };

export {};
