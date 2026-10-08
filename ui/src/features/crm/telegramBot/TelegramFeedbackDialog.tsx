// A teacher's (or admin's) good or bad feedback about a student, sent by the Telegram bot to the
// student and every parent following them.
import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { getApiPayload } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { telegramBotAPI } from './api';

export function TelegramFeedbackDialog({
  studentId,
  studentName,
  open,
  onOpenChange,
}: {
  studentId: number | null;
  studentName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!studentId || !text.trim()) return;
    setSending(true);
    try {
      const result = getApiPayload<{ linked?: boolean }>(await telegramBotAPI.sendFeedback({ student_id: studentId, text: text.trim() }));
      if (result?.linked === false) {
        showToast.info(t('This student and their parents have not joined the Telegram bot yet.'));
      } else {
        showToast.success(t('Sent to the student and parents on Telegram'));
        setText('');
        onOpenChange(false);
      }
    } catch (error) {
      showToast.error(getErrorMessage(error) || t("Couldn't send the message"));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Message on Telegram')}</DialogTitle>
          <DialogDescription>{studentName ? `${studentName} · ${t('student and parents')}` : t('student and parents')}</DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, 1500))}
          rows={5}
          placeholder={t('e.g. Did very well in today’s lesson / Has not done homework three times')}
          aria-label={t('Message on Telegram')}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>{t('Cancel')}</Button>
          <Button onClick={send} disabled={!text.trim() || sending}>
            {sending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
            {t('Send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
