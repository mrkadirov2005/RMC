// What students and parents send from the Telegram bot: suggestions and complaints to the director
// and messages to teachers. A teacher sees the messages sent to them.
import { useEffect, useState } from 'react';
import { Check, Inbox, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { unwrapApiRows } from '@/shared/api/response';
import { useLanguage } from '@/i18n/LanguageContext';
import { telegramBotAPI } from './api';

interface InboxMessage {
  inbox_id: number;
  kind: 'suggestion' | 'complaint' | 'to_teacher';
  text: string;
  is_read: boolean;
  created_at: string;
  sender_role: string | null;
  sender_name: string | null;
  student_name: string | null;
  teacher_name: string | null;
}

const KIND_STYLE: Record<InboxMessage['kind'], { label: string; className: string }> = {
  complaint: { label: 'Complaint', className: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200' },
  suggestion: { label: 'Suggestion', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' },
  to_teacher: { label: 'To teacher', className: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200' },
};

const formatWhen = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export function TelegramInboxPanel({ title, hideWhenEmpty = false, className }: { title?: string; hideWhenEmpty?: boolean; className?: string }) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<InboxMessage[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    telegramBotAPI
      .getInbox()
      .then((response) => {
        if (!cancelled) setMessages(unwrapApiRows<InboxMessage>(response));
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const markRead = async (id: number) => {
    setMessages((current) => (current || []).map((message) => (message.inbox_id === id ? { ...message, is_read: true } : message)));
    await telegramBotAPI.markInboxRead(id).catch(() => null);
  };

  if (!messages || (hideWhenEmpty && messages.length === 0)) return null;
  const unread = messages.filter((message) => !message.is_read).length;

  return (
    <section className={cn('rounded-xl border bg-card p-4 shadow-sm', className)}>
      <div className="mb-3 flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-sky-600" />
        <h2 className="font-black">{title || t('Messages from Telegram')}</h2>
        {unread > 0 && <span className="rounded-full bg-sky-600 px-2 py-0.5 text-xs font-bold text-white">{t('{count} new', { count: unread })}</span>}
      </div>
      {messages.length === 0 ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Inbox className="h-4 w-4" />{t('No messages yet.')}</div>
      ) : (
        <ul className="divide-y">
          {messages.map((message) => {
            const kind = KIND_STYLE[message.kind] || KIND_STYLE.suggestion;
            return (
              <li key={message.inbox_id} className={cn('flex flex-col gap-1.5 py-3 sm:flex-row sm:items-start sm:justify-between', !message.is_read && 'font-medium')}>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={cn('rounded-md px-1.5 py-0.5 font-bold', kind.className)}>{t(kind.label)}</span>
                    <span className="text-muted-foreground">
                      {[message.sender_name, message.sender_role === 'parent' ? t('parent') : t('student'), message.student_name && `· ${message.student_name}`, message.teacher_name && `→ ${message.teacher_name}`].filter(Boolean).join(' ')}
                    </span>
                    <span className="text-muted-foreground">{formatWhen(message.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
                </div>
                {!message.is_read && (
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => markRead(message.inbox_id)}>
                    <Check className="mr-1 h-3.5 w-3.5" /> {t('Mark read')}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
