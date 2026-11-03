// The English level tests, Beginner to C1, as a row of cards on top of the tests page: how each one
// went, a click to open it, and "Add level tests" while some are missing (owners and admins).

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { levelTestsApi, type LevelTestEntry } from '../api/levelTestsApi';
import { passRate, passTone, type PassStats } from './PassRateLine';

// One colour per step of the ladder, light to strong.
const LEVEL_COLORS: Record<string, string> = {
  Beginner: '#38bdf8',
  A1: '#22c55e',
  A2: '#84cc16',
  'A2+': '#eab308',
  B1: '#f97316',
  B2: '#ef4444',
  C1: '#a855f7',
};

interface LevelTestShelfProps {
  /** The center's tests with their results (from the tests list), to show how each level went. */
  statsByTestId: Map<number, PassStats & { submission_count?: number | null }>;
  canInstall: boolean;
  onInstalled: () => void;
}

export const LevelTestShelf = ({ statsByTestId, canInstall, onInstalled }: LevelTestShelfProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [levels, setLevels] = useState<LevelTestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);

  const load = useCallback(async () => {
    try {
      setLevels(await levelTestsApi.list());
    } catch {
      setLevels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const missing = levels.filter((level) => !level.installed_test_id).length;

  const install = async () => {
    setInstalling(true);
    try {
      const out = await levelTestsApi.install();
      showToast.success(t('{count} level tests added', { count: out.created.length }));
      await load();
      onInstalled();
    } catch {
      // Shown by the API client.
    } finally {
      setInstalling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center rounded-lg border bg-card py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }
  if (!levels.length) return null;

  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <GraduationCap className="h-5 w-5 text-primary" />
            {t('English level tests')}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t('Grammar, vocabulary and reading; graded at once, pass mark 70%.')}
          </p>
        </div>
        {missing > 0 &&
          (canInstall ? (
            <Button size="sm" className="gap-1.5" disabled={installing} onClick={() => void install()}>
              {installing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t('Add level tests ({count})', { count: missing })}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">{t('An administrator can add the missing level tests.')}</span>
          ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {levels.map((level) => {
          const testId = level.installed_test_id;
          const stats = testId ? statsByTestId.get(testId) : undefined;
          const rate = stats ? passRate(stats) : null;
          const color = LEVEL_COLORS[level.level] || '#64748b';
          return (
            <button
              key={level.key}
              type="button"
              disabled={!testId}
              onClick={() => testId && navigate(`/tests/${testId}`)}
              className={cn(
                'group flex flex-col rounded-lg border p-3 text-left transition-shadow',
                testId ? 'hover:shadow-md' : 'cursor-default opacity-60'
              )}
            >
              <span
                data-keep-bg
                className="mb-2 flex h-10 w-10 items-center justify-center rounded-full text-sm font-black text-white"
                style={{ backgroundColor: color }}
              >
                {level.level === 'Beginner' ? 'A0' : level.level}
              </span>
              <span className="text-sm font-bold">{level.level}</span>
              <span className="text-[0.6875rem] text-muted-foreground">
                {t('{questions} questions · {minutes} min', { questions: level.questions, minutes: level.duration_minutes })}
              </span>
              <span className="mt-2 text-xs">
                {!testId ? (
                  <span className="text-muted-foreground">{t('Not added')}</span>
                ) : rate === null ? (
                  <span className="text-muted-foreground">{t('Not taken yet')}</span>
                ) : (
                  <span className={cn('font-bold tabular-nums', passTone(rate).text)}>
                    {t('{rate}% passed', { rate })} · {Number(stats?.graded_count) || 0}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
