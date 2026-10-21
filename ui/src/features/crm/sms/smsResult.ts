import type { SmsSendResult } from './api';

type Translate = (value: string, vars?: Record<string, string | number>) => string;

/** One toast line for what happened to a send: how many queued, skipped and why, and the day's limit. */
export const describeSmsResult = (result: SmsSendResult, t: Translate) => {
  const parts = [t('{count} SMS queued', { count: result.queued })];
  if (result.already_sent > 0) parts.push(t('{count} already sent today', { count: result.already_sent }));
  if (result.no_phone > 0) parts.push(t('{count} without a phone number', { count: result.no_phone }));
  if (result.not_applicable > 0) parts.push(t('{count} not applicable', { count: result.not_applicable }));
  if (result.queued > 0 && result.sent_today + result.waiting > result.daily_limit) {
    parts.push(t('Daily limit is {limit}; the rest go out tomorrow', { limit: result.daily_limit }));
  } else if (result.queued > 0 && !result.sending_now) {
    parts.push(t('They go out in the morning'));
  }
  return parts.join(' · ');
};
