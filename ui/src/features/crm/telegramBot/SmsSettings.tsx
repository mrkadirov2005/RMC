// Settings → SMS: parents who have not joined the Telegram bot get a missed lesson, a payment
// reminder and a teacher's message by SMS from the center's phone. Shows whether the phone is
// connected, today's count against the daily limit, which kinds are on, and the latest messages.
import { useCallback, useEffect, useState } from 'react';
import { Loader2, MessageSquareText, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SectionPanel } from '@/components/common/SectionPanel';
import { smsAPI, type SmsKindSettings } from './api';
import { getApiPayload, unwrapApiRows } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';

interface SmsStatus {
  configured: boolean;
  daily_limit: number;
  sent_today: number;
  queued: number;
  send_from_hour: number;
  send_to_hour: number;
  settings: SmsKindSettings;
}

interface SmsMessage {
  sms_id: number;
  kind: string;
  phone: string;
  text: string;
  status: string;
  error?: string | null;
  created_at: string;
  student_name?: string | null;
}

const KIND_LABELS: Array<[keyof SmsKindSettings, string]> = [
  ['absence', 'Missed a lesson'],
  ['payment_reminder', 'Payment reminder'],
  ['teacher_feedback', "Teacher's message"],
];

const STATUS_STYLES: Record<string, string> = {
  delivered: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  sent: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  queued: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  sending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  failed: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  expired: 'bg-muted text-muted-foreground',
};

const STATUS_LABELS: Record<string, string> = {
  delivered: 'Delivered',
  sent: 'Sent',
  queued: 'Waiting',
  sending: 'Sending',
  failed: 'Failed',
  expired: 'Expired',
};

export function SmsSettings() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<SmsStatus | null>(null);
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    smsAPI.getStatus().then((response) => setStatus(getApiPayload<SmsStatus>(response))).catch(() => setStatus(null));
    smsAPI.getMessages().then((response) => setMessages(unwrapApiRows(response))).catch(() => null);
  }, []);

  useEffect(load, [load]);

  if (!status) return null;

  const toggle = async (kind: keyof SmsKindSettings, value: boolean) => {
    const next = { ...status.settings, [kind]: value };
    setStatus({ ...status, settings: next });
    setSaving(true);
    try {
      const saved = getApiPayload<SmsKindSettings>(await smsAPI.saveSettings(next));
      if (saved) setStatus((current) => (current ? { ...current, settings: saved } : current));
    } catch (error) {
      setStatus((current) => (current ? { ...current, settings: { ...next, [kind]: !value } } : current));
      showToast.error(getErrorMessage(error) || t("Couldn't save the SMS settings"));
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setSendingTest(true);
    try {
      const result = getApiPayload<{ sending_now?: boolean }>(await smsAPI.sendTest(testPhone.trim()));
      showToast.success(result?.sending_now === false
        ? t('Test SMS queued; it goes out at {hour}:00.', { hour: status.send_from_hour })
        : t('Test SMS queued; it should arrive within a minute.'));
      load();
    } catch (error) {
      showToast.error(getErrorMessage(error) || t("Couldn't send the test SMS"));
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <SectionPanel
      title={
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm"><MessageSquareText className="h-4 w-4" /></span>
          {t('SMS to parents')}
        </span>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('Parents who have not joined the Telegram bot get these by SMS from the center phone.')}
        </p>

        {status.configured ? (
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-300">{t('Phone connected')}</Badge>
            <Badge variant="outline">{t('Sent today: {sent} / {limit}', { sent: status.sent_today, limit: status.daily_limit })}</Badge>
            {status.queued > 0 && <Badge variant="outline">{t('Waiting: {count}', { count: status.queued })}</Badge>}
            <Badge variant="outline">{t('Sends {from}:00–{to}:00', { from: status.send_from_hour, to: status.send_to_hour })}</Badge>
          </div>
        ) : (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
            {t('The SMS phone is not connected yet, so no SMS are sent.')}
          </p>
        )}

        <div className="space-y-3">
          {KIND_LABELS.map(([kind, label]) => (
            <div key={kind} className="flex items-center justify-between gap-3">
              <Label htmlFor={`sms-${kind}`}>{t(label)}</Label>
              <Switch id={`sms-${kind}`} checked={status.settings[kind]} disabled={saving} onCheckedChange={(checked) => void toggle(kind, checked)} />
            </div>
          ))}
        </div>

        {status.configured && (
          <div className="space-y-2">
            <Label htmlFor="sms-test-phone">{t('Send a test SMS')}</Label>
            <div className="flex gap-2">
              <Input id="sms-test-phone" type="tel" inputMode="tel" placeholder="+998 90 123 45 67" value={testPhone} onChange={(event) => setTestPhone(event.target.value)} />
              <Button type="button" variant="outline" onClick={sendTest} disabled={sendingTest || !testPhone.trim()}>
                {sendingTest ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
                {t('Send')}
              </Button>
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="space-y-2">
            <Label>{t('Latest SMS')}</Label>
            <ul className="divide-y rounded-md border text-sm">
              {messages.slice(0, 15).map((message) => (
                <li key={message.sms_id} className="space-y-1 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{message.student_name || message.phone}</span>
                    <span className={`rounded px-2 py-0.5 text-xs ${STATUS_STYLES[message.status] || ''}`}>{t(STATUS_LABELS[message.status] || message.status)}</span>
                  </div>
                  <p className="whitespace-pre-line break-words text-muted-foreground">{message.text}</p>
                  {message.status === 'failed' && message.error && <p className="break-words text-xs text-rose-600 dark:text-rose-300">{message.error}</p>}
                  <p className="text-xs text-muted-foreground">{message.phone} · {new Date(message.created_at).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' })}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </SectionPanel>
  );
}
