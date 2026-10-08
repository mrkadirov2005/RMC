// "Before" (recorded when the child starts) and "after" (after 5-6 months) videos to show parents.
// The videos stay on Loom or Google Drive; the platform keeps the links and plays them here.

import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Save, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getApiPayload } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { studentAPI } from '../api';
import { toVideoEmbedUrl } from './videoEmbed';

type Slot = 'before_video_url' | 'after_video_url';

const SLOTS: Array<{ key: Slot; title: string; hint: string }> = [
  { key: 'before_video_url', title: 'Before', hint: 'Q&A video recorded when the student started.' },
  { key: 'after_video_url', title: 'After', hint: 'The same questions after 5-6 months.' },
];

export const VideosTab = ({ studentId }: { studentId: number }) => {
  const { t } = useLanguage();
  const [links, setLinks] = useState<Record<Slot, string>>({ before_video_url: '', after_video_url: '' });
  const [saved, setSaved] = useState<Record<Slot, string>>({ before_video_url: '', after_video_url: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    studentAPI
      .getVideos(studentId)
      .then((response) => {
        if (cancelled) return;
        const data = getApiPayload<Partial<Record<Slot, string | null>>>(response) || {};
        const next = { before_video_url: data.before_video_url || '', after_video_url: data.after_video_url || '' };
        setLinks(next);
        setSaved(next);
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const save = async () => {
    setSaving(true);
    try {
      const response = await studentAPI.saveVideos(studentId, {
        before_video_url: links.before_video_url.trim() || null,
        after_video_url: links.after_video_url.trim() || null,
      });
      const data = getApiPayload<Partial<Record<Slot, string | null>>>(response) || {};
      const next = { before_video_url: data.before_video_url || '', after_video_url: data.after_video_url || '' };
      setLinks(next);
      setSaved(next);
      showToast.success(t('Videos saved'));
    } catch (error) {
      showToast.error(getErrorMessage(error) || t("Couldn't save the videos"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const changed = links.before_video_url !== saved.before_video_url || links.after_video_url !== saved.after_video_url;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t('Paste a Loom, Google Drive or YouTube link. For Google Drive, share the file as "Anyone with the link".')}
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {SLOTS.map((slot) => {
          const embed = toVideoEmbedUrl(saved[slot.key]);
          return (
            <Card key={slot.key} className="border border-slate-200 shadow-sm dark:border-border">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Video className="h-4 w-4" /> {t(slot.title)}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{t(slot.hint)}</p>
              </CardHeader>
              <CardContent className="space-y-2 p-3 pt-0">
                {embed ? (
                  <div className="aspect-video overflow-hidden rounded-lg border bg-black">
                    <iframe
                      src={embed}
                      title={t(slot.title)}
                      className="h-full w-full"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                    {t('No video yet')}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={links[slot.key]}
                    onChange={(event) => setLinks((current) => ({ ...current, [slot.key]: event.target.value }))}
                    placeholder="https://www.loom.com/share/…"
                    aria-label={t(slot.title)}
                  />
                  {saved[slot.key] && (
                    <Button asChild variant="outline" size="icon" title={t('Open')}>
                      <a href={saved[slot.key]} target="_blank" rel="noreferrer noopener">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={!changed || saving}>
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
          {t('Save')}
        </Button>
      </div>
    </div>
  );
};
