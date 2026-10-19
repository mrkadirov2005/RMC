import { useEffect, useState } from 'react';
import { Loader2, Palette, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { DEFAULT_TOP_COLOR, TOP_PLACES, normalizeTopColor, saveTopStudentsColor, topRowStyle, useTopStudentsColor } from '../standings';

const PRESETS = [DEFAULT_TOP_COLOR, '#FB923C', '#4ADE80', '#38BDF8', '#A78BFA', '#F472B6'];

// The teacher's colour for the top five students in their group tables. Yellow until changed.
export default function TopStudentsColorSetting() {
  const { t } = useLanguage();
  const saved = useTopStudentsColor();
  const [color, setColor] = useState(saved);
  const [saving, setSaving] = useState(false);

  useEffect(() => setColor(saved), [saved]);

  const save = async (value: string | null) => {
    setSaving(true);
    try {
      await saveTopStudentsColor(value);
      showToast.success(t('Colour saved'));
    } catch (err: any) {
      showToast.error(err?.response?.data?.error || t('Could not save the colour'));
    } finally {
      setSaving(false);
    }
  };

  const changed = normalizeTopColor(color) !== saved;

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-bold">
        <Palette className="h-4 w-4 text-amber-500" />
        {t('Top students colour')}
      </h3>
      <p className="mb-3 text-xs text-muted-foreground">{t('The top {count} students of each group, by points over all lessons, are shown in this colour.', { count: TOP_PLACES })}</p>
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-label={preset}
            onClick={() => setColor(preset)}
            className={cn('h-8 w-8 rounded-full border-2 transition', normalizeTopColor(color) === preset ? 'border-foreground scale-110' : 'border-transparent')}
            style={{ backgroundColor: preset }}
          />
        ))}
        <label className="flex h-8 items-center gap-2 rounded-md border px-2 text-xs font-semibold">
          <input type="color" aria-label={t('Pick a colour')} value={normalizeTopColor(color)} onChange={(event) => setColor(event.target.value)} className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0" />
          {normalizeTopColor(color)}
        </label>
      </div>
      <div className="mt-3 rounded-md border px-3 py-2 text-sm font-semibold" style={topRowStyle(color)}>
        1. {t('Example student')}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        {saved !== DEFAULT_TOP_COLOR && (
          <Button variant="ghost" size="sm" onClick={() => save(null)} disabled={saving}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            {t('Back to yellow')}
          </Button>
        )}
        <Button size="sm" onClick={() => save(color)} disabled={saving || !changed}>
          {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {t('Save colour')}
        </Button>
      </div>
    </div>
  );
}
