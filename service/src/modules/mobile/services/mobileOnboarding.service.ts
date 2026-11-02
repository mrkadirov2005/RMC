const repo = require('../repositories/mobileOnboarding.repository');

type Role = 'student' | 'parent';
type TelegramStatus = 'verified' | 'not_member' | 'not_linked' | 'not_configured' | 'unavailable';

const CONSENT_KINDS = ['video'] as const;
const CACHE_MS = 10 * 60 * 1000;
const ADULT_AGE = 18;

// The same settings the bot uses for its required channel.
const telegramConfig = () => {
  const channel = String(process.env.TELEGRAM_REQUIRED_CHANNEL || '').trim();
  const botUsername = String(process.env.TELEGRAM_BOT_USERNAME || '').trim().replace(/^@/, '');
  return {
    token: String(process.env.TELEGRAM_BOT_TOKEN || '').trim(),
    channel,
    channelUrl: channel.startsWith('@') ? `https://t.me/${channel.slice(1)}` : String(process.env.TELEGRAM_CHANNEL_URL || '').trim() || null,
    botUrl: botUsername ? `https://t.me/${botUsername}` : null,
  };
};

const memberCache = new Map<number, { ok: boolean; at: number }>();

// @MOB-113 getChatMember through the bot, as the bot checks it. Unlike the bot, an API failure is
// reported as unavailable, never as verified.
const isChannelMember = async (telegramUserId: number, fresh: boolean, fetchFn: typeof fetch = fetch): Promise<boolean | null> => {
  const cached = memberCache.get(telegramUserId);
  if (!fresh && cached && Date.now() - cached.at < CACHE_MS) return cached.ok;
  const { token, channel } = telegramConfig();
  try {
    const response = await fetchFn(`https://api.telegram.org/bot${token}/getChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: channel, user_id: telegramUserId }),
      signal: AbortSignal.timeout(8000),
    });
    const data: any = await response.json().catch(() => null);
    if (!data?.ok) {
      // "user not found" / "PARTICIPANT_ID_INVALID": never joined.
      if (data && /not found|participant/i.test(String(data.description || ''))) {
        memberCache.set(telegramUserId, { ok: false, at: Date.now() });
        return false;
      }
      console.error('Telegram membership check failed:', data?.description || response.status);
      return null;
    }
    const status = String(data.result?.status || '');
    const ok = ['creator', 'administrator', 'member'].includes(status) || (status === 'restricted' && Boolean(data.result?.is_member));
    memberCache.set(telegramUserId, { ok, at: Date.now() });
    return ok;
  } catch (error: any) {
    console.error('Telegram membership check failed:', error?.message || error);
    return null;
  }
};

// @MOB-113 Returns verified, not_member or not_linked (plus not_configured / unavailable when the
// check cannot run). A verified result is remembered on the onboarding row.
const telegramStatus = async (userType: Role, userId: number, { fresh = false, fetchFn }: { fresh?: boolean; fetchFn?: typeof fetch } = {}) => {
  const config = telegramConfig();
  const links = { channel_url: config.channelUrl, bot_url: config.botUrl };
  if (!config.token || !config.channel) return { status: 'not_configured' as TelegramStatus, ...links };
  const telegramUserId = await repo.telegramUserId(userType, userId);
  if (!telegramUserId) return { status: 'not_linked' as TelegramStatus, ...links };
  const member = await isChannelMember(telegramUserId, fresh, fetchFn);
  if (member === null) return { status: 'unavailable' as TelegramStatus, ...links };
  if (member) await repo.saveState(userType, userId, { telegram: true });
  return { status: (member ? 'verified' : 'not_member') as TelegramStatus, ...links };
};

const ageOn = (birth: string | Date | null, now: Date) => {
  if (!birth) return null;
  const date = new Date(birth);
  if (Number.isNaN(date.getTime())) return null;
  let age = now.getFullYear() - date.getFullYear();
  if (now.getMonth() < date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() < date.getDate())) age -= 1;
  return age;
};

// @MOB-112 Who may answer: a parent for any of their children; a student only for themself and
// only when known to be an adult. Unknown age counts as a minor.
const consents = async (userType: Role, userId: number, now = new Date()) => {
  const rows = await repo.consentSubjects(userType, userId, 'video');
  return rows.map((row: any) => {
    const age = ageOn(row.date_of_birth, now);
    const minor = age == null || age < ADULT_AGE;
    return {
      student_id: Number(row.student_id),
      first_name: row.first_name,
      last_name: row.last_name,
      kind: 'video',
      minor,
      granted: row.granted ?? null,
      answered_at: row.answered_at ?? null,
      can_answer: userType === 'parent' || !minor,
    };
  });
};

// @MOB-112 Everything the onboarding screen needs in one call.
const state = async (userType: Role, userId: number) => {
  const [row, telegram, consentRows, instagramUrl] = await Promise.all([
    repo.getState(userType, userId),
    telegramStatus(userType, userId),
    consents(userType, userId),
    repo.instagramLink(),
  ]);
  return {
    show: !row || (!row.completed_at && !row.skipped),
    completed_at: row?.completed_at ?? null,
    skipped: Boolean(row?.skipped),
    telegram,
    instagram: { url: process.env.MOBILE_INSTAGRAM_URL || instagramUrl || null, opened: Boolean(row?.instagram_opened_at) },
    consents: consentRows,
  };
};

const markInstagramOpened = (userType: Role, userId: number) => repo.saveState(userType, userId, { instagram: true });

const finish = (userType: Role, userId: number, skipped: boolean) =>
  repo.saveState(userType, userId, skipped ? { skipped: true } : { completed: true, skipped: false });

// @MOB-112 Records an answer; refuses one the user may not give.
const answerConsent = async (userType: Role, userId: number, studentId: number, kind: string, granted: boolean) => {
  if (!(CONSENT_KINDS as readonly string[]).includes(kind)) return { kind: 'invalid' as const };
  const subject = (await consents(userType, userId)).find((c: any) => c.student_id === studentId);
  if (!subject) return { kind: 'not_found' as const };
  if (!subject.can_answer) return { kind: 'parent_required' as const };
  const consent = await repo.addConsent({ studentId, kind, granted, byType: userType, byId: userId });
  return { kind: 'ok' as const, consent };
};

module.exports = { telegramStatus, isChannelMember, consents, state, markInstagramOpened, finish, answerConsent, ageOn, memberCache };

export {};
