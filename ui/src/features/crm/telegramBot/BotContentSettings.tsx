// Settings → Telegram bot: what the bot shows under "About the director", "Center rules" and
// "Prizes", and how many students and parents have joined.
import { useEffect, useState } from 'react';
import { Bot, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SectionPanel } from '@/components/common/SectionPanel';
import { getApiPayload, unwrapApiRows } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { telegramBotAPI } from './api';

interface BotContent {
  about_director: string;
  rules: string;
  prizes: Array<{ name: string; coins: number }>;
}

export function BotContentSettings() {
  const { t } = useLanguage();
  const [content, setContent] = useState<BotContent>({ about_director: '', rules: '', prizes: [] });
  const [stats, setStats] = useState<Array<{ role: string; students: number; chats: number }>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    telegramBotAPI.getContent().then((response) => {
      const data = getApiPayload<BotContent>(response);
      if (data) setContent({ about_director: data.about_director || '', rules: data.rules || '', prizes: data.prizes || [] });
    }).catch(() => null);
    telegramBotAPI.getStats().then((response) => setStats(unwrapApiRows(response))).catch(() => null);
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const saved = getApiPayload<BotContent>(await telegramBotAPI.saveContent({
        ...content,
        prizes: content.prizes.filter((prize) => prize.name.trim()),
      }));
      if (saved) setContent(saved);
      showToast.success(t('Bot information saved'));
    } catch (error) {
      showToast.error(getErrorMessage(error) || t("Couldn't save the bot information"));
    } finally {
      setSaving(false);
    }
  };

  const updatePrize = (index: number, key: 'name' | 'coins', value: string) => setContent((current) => ({
    ...current,
    prizes: current.prizes.map((prize, i) => (i === index ? { ...prize, [key]: key === 'coins' ? Math.max(0, Number(value) || 0) : value } : prize)),
  }));

  const linkedStudents = stats.find((row) => row.role === 'student')?.students || 0;
  const linkedParents = stats.find((row) => row.role === 'parent')?.chats || 0;

  return (
    <SectionPanel
      title={
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm"><Bot className="h-4 w-4" /></span>
          {t('Telegram bot')}
        </span>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('{students} students and {parents} parents have joined the bot.', { students: linkedStudents, parents: linkedParents })}
        </p>
        <div className="space-y-2">
          <Label htmlFor="bot-about">{t('About the director')}</Label>
          <Textarea id="bot-about" rows={4} value={content.about_director} onChange={(event) => setContent((current) => ({ ...current, about_director: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bot-rules">{t('Center rules')}</Label>
          <Textarea id="bot-rules" rows={5} value={content.rules} onChange={(event) => setContent((current) => ({ ...current, rules: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>{t('Prizes and their price in coins')}</Label>
          {content.prizes.map((prize, index) => (
            <div key={index} className="flex gap-2">
              <Input value={prize.name} onChange={(event) => updatePrize(index, 'name', event.target.value)} placeholder={t('Prize')} aria-label={t('Prize')} />
              <Input type="number" min={0} value={prize.coins} onChange={(event) => updatePrize(index, 'coins', event.target.value)} className="w-28" aria-label={t('Coins')} />
              <Button variant="outline" size="icon" onClick={() => setContent((current) => ({ ...current, prizes: current.prizes.filter((_, i) => i !== index) }))} aria-label={t('Delete')}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setContent((current) => ({ ...current, prizes: [...current.prizes, { name: '', coins: 0 }] }))}>
            <Plus className="mr-1 h-4 w-4" /> {t('Add prize')}
          </Button>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            {t('Save')}
          </Button>
        </div>
      </div>
    </SectionPanel>
  );
}
