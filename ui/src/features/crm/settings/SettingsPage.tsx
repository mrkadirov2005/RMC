// Page component for the settings screen in the crm feature.

import { useEffect, useState } from 'react';
import { Activity, CalendarDays, Clock, Coins, Globe, Palette, RotateCcw, Save, Server, Settings as SettingsIcon, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { settingsAPI } from './api';
import { showToast } from '@/utils/toast';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionPanel } from '@/components/common/SectionPanel';
import { useLanguage } from '../../../i18n/LanguageContext';
import { cn } from '@/lib/utils';
import {
  defaultLessonScoringSettings,
  normalizeLessonScoringSettings,
  type LessonScoringSettings,
} from '../classes/lessonScoringSettings';
import {
  CALENDAR_DAY_END_HOUR_KEY,
  CALENDAR_DAY_START_HOUR_KEY,
  CALENDAR_DEFAULT_VIEW_KEY,
} from '../calendar/utils';
import {
  applyListRowColors,
  DEFAULT_LIST_ROW_ALTERNATE,
  DEFAULT_LIST_ROW_PRIMARY,
  LIST_ROW_ALTERNATE_KEY,
  LIST_ROW_PRIMARY_KEY,
  readListRowColors,
} from './listAppearance';
import { DEFAULT_OWNER_PALETTE, ownerPalettePresets, readOwnerPalette, saveOwnerPalette, type OwnerPaletteId } from './ownerPalette';

const DEFAULT_DURATION_KEY = 'lesson_duration_default';
const OVERRIDE_DURATION_KEY = 'lesson_duration_override';

const readStoredNumber = (key: string, fallback: number) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  } catch {
    return fallback;
  }
};

const readStoredHour = (key: string, fallback: number) => {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value >= 0 && value <= 23 ? value : fallback;
  } catch {
    return fallback;
  }
};

const readStoredView = () => {
  try {
    return localStorage.getItem(CALENDAR_DEFAULT_VIEW_KEY) === 'week' ? 'week' : 'month';
  } catch {
    return 'month';
  }
};

const hourOptions = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: `${String(hour).padStart(2, '0')}:00`,
}));

type ScoreSection = 'attendance' | 'homework' | 'activity';

// Renders the settings page screen.
const SettingsPage = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [defaultDuration, setDefaultDuration] = useState(90);
  const [overrideDuration, setOverrideDuration] = useState<number | ''>('');
  const [calendarDefaultView, setCalendarDefaultView] = useState<'month' | 'week'>('month');
  const [calendarStartHour, setCalendarStartHour] = useState(8);
  const [calendarEndHour, setCalendarEndHour] = useState(18);
  const [lessonScoring, setLessonScoring] = useState<LessonScoringSettings>(defaultLessonScoringSettings);
  const [primaryRowColor, setPrimaryRowColor] = useState(DEFAULT_LIST_ROW_PRIMARY);
  const [alternateRowColor, setAlternateRowColor] = useState(DEFAULT_LIST_ROW_ALTERNATE);
  const [ownerPalette, setOwnerPalette] = useState<OwnerPaletteId>(DEFAULT_OWNER_PALETTE);

  useEffect(() => {
    setDefaultDuration(readStoredNumber(DEFAULT_DURATION_KEY, 90));
    const overrideValue = readStoredNumber(OVERRIDE_DURATION_KEY, 0);
    setOverrideDuration(overrideValue > 0 ? overrideValue : '');
    setCalendarDefaultView(readStoredView());
    setCalendarStartHour(readStoredHour(CALENDAR_DAY_START_HOUR_KEY, 8));
    setCalendarEndHour(readStoredHour(CALENDAR_DAY_END_HOUR_KEY, 18));
    const rowColors = readListRowColors();
    setPrimaryRowColor(rowColors.primary);
    setAlternateRowColor(rowColors.alternate);
    setOwnerPalette(readOwnerPalette().id);
    settingsAPI.getLessonScoring()
      .then((response) => setLessonScoring(normalizeLessonScoringSettings(response.data)))
      .catch(() => setLessonScoring(defaultLessonScoringSettings));
    settingsAPI.getOwnerPalette()
      .then((response) => {
        const palette = response.data?.palette;
        setOwnerPalette(saveOwnerPalette(palette).id);
      })
      .catch(() => setOwnerPalette(readOwnerPalette().id));
  }, []);

  const updateScoreOption = (section: ScoreSection, index: number, key: 'label' | 'score' | 'symbol' | 'fill', value: string) => {
    setLessonScoring((current) => ({
      ...current,
      [section]: current[section].map((option, optionIndex) => optionIndex === index
        ? { ...option, [key]: key === 'label' || key === 'symbol' ? value : Number(value) }
        : option),
    }));
  };

  const updateCoinMapping = (index: number, key: 'score' | 'coins', value: string) => {
    setLessonScoring((current) => ({
      ...current,
      coinScoreMapping: current.coinScoreMapping.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: Number(value) } : row),
    }));
  };

  const handleSave = async () => {
    if (!Number.isFinite(defaultDuration) || defaultDuration <= 0) {
      showToast.error('Lesson length must be a positive number.');
      return;
    }
    if (calendarStartHour > calendarEndHour) {
      showToast.error('Calendar start hour must be before end hour.');
      return;
    }

    localStorage.setItem(DEFAULT_DURATION_KEY, String(defaultDuration));
    if (overrideDuration && Number(overrideDuration) > 0) {
      localStorage.setItem(OVERRIDE_DURATION_KEY, String(overrideDuration));
    } else {
      localStorage.removeItem(OVERRIDE_DURATION_KEY);
    }
    localStorage.setItem(CALENDAR_DEFAULT_VIEW_KEY, calendarDefaultView);
    localStorage.setItem(CALENDAR_DAY_START_HOUR_KEY, String(calendarStartHour));
    localStorage.setItem(CALENDAR_DAY_END_HOUR_KEY, String(calendarEndHour));
    localStorage.setItem(LIST_ROW_PRIMARY_KEY, primaryRowColor);
    localStorage.setItem(LIST_ROW_ALTERNATE_KEY, alternateRowColor);
    applyListRowColors(primaryRowColor, alternateRowColor);
    saveOwnerPalette(ownerPalette);
    try {
      await settingsAPI.saveLessonScoring(lessonScoring);
      showToast.success('Settings saved.');
    } catch {
      showToast.error('Failed to save lesson scoring settings.');
    }
  };

  const handleClearOverride = () => {
    localStorage.removeItem(OVERRIDE_DURATION_KEY);
    setOverrideDuration('');
    showToast.success('Override cleared.');
  };

  const handleResetCalendar = () => {
    localStorage.removeItem(CALENDAR_DEFAULT_VIEW_KEY);
    localStorage.removeItem(CALENDAR_DAY_START_HOUR_KEY);
    localStorage.removeItem(CALENDAR_DAY_END_HOUR_KEY);
    setCalendarDefaultView('month');
    setCalendarStartHour(8);
    setCalendarEndHour(18);
    showToast.success('Calendar preferences reset.');
  };

  const handleResetAll = () => {
    localStorage.removeItem(DEFAULT_DURATION_KEY);
    localStorage.removeItem(OVERRIDE_DURATION_KEY);
    localStorage.removeItem(CALENDAR_DEFAULT_VIEW_KEY);
    localStorage.removeItem(CALENDAR_DAY_START_HOUR_KEY);
    localStorage.removeItem(CALENDAR_DAY_END_HOUR_KEY);
    localStorage.removeItem(LIST_ROW_PRIMARY_KEY);
    localStorage.removeItem(LIST_ROW_ALTERNATE_KEY);
    saveOwnerPalette(DEFAULT_OWNER_PALETTE);
    settingsAPI.saveOwnerPalette(DEFAULT_OWNER_PALETTE).catch(() => null);
    settingsAPI.saveLessonScoring(defaultLessonScoringSettings).catch(() => null);
    setDefaultDuration(90);
    setOverrideDuration('');
    setCalendarDefaultView('month');
    setCalendarStartHour(8);
    setCalendarEndHour(18);
    setPrimaryRowColor(DEFAULT_LIST_ROW_PRIMARY);
    setAlternateRowColor(DEFAULT_LIST_ROW_ALTERNATE);
    setOwnerPalette(DEFAULT_OWNER_PALETTE);
    applyListRowColors(DEFAULT_LIST_ROW_PRIMARY, DEFAULT_LIST_ROW_ALTERNATE);
    setLessonScoring(defaultLessonScoringSettings);
    showToast.success('Settings reset to defaults.');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <PageHeader
        title="Settings"
        description="Configure lesson generation, calendar defaults, and local workspace preferences."
        icon={SettingsIcon}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </Button>
            <Button variant="outline" onClick={handleResetAll}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset All
            </Button>
          </div>
        }
      />

      <SectionPanel
        title={
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
              <Globe className="h-4 w-4" />
            </span>
            {t('Language')}
          </span>
        }
      >
        <div className="space-y-3">
          <Label>{t('Select interface language')}</Label>
          <div className="flex gap-3">
            {([
              { code: 'en' as const, label: 'English', flag: '🇬🇧' },
              { code: 'uz' as const, label: "O'zbekcha", flag: '🇺🇿' },
            ]).map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => { setLanguage(option.code); showToast.success(`Language changed to ${option.label}`); }}
                className={cn(
                  'flex items-center gap-3 rounded-xl border-2 px-5 py-3 text-sm font-semibold transition-all',
                  language === option.code
                    ? 'border-violet-500 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                )}
              >
                <span className="text-xl">{option.flag}</span>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </SectionPanel>

      <SectionPanel
        title={
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 text-white shadow-sm">
              <Server className="h-4 w-4" />
            </span>
            System tools
          </span>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => navigate('/logs')} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 dark:border-border dark:bg-card dark:hover:bg-muted">
            <Activity className="h-5 w-5 text-slate-500" />
            <span><strong className="block text-sm">Journals</strong><small className="text-muted-foreground">Review request and activity logs.</small></span>
          </button>
          <button type="button" onClick={() => navigate('/engineering')} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 dark:border-border dark:bg-card dark:hover:bg-muted">
            <Server className="h-5 w-5 text-slate-500" />
            <span><strong className="block text-sm">Engineering</strong><small className="text-muted-foreground">Open database and server tools.</small></span>
          </button>
        </div>
      </SectionPanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionPanel
          title={<span className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white"><Palette className="h-4 w-4" /></span>Owner panel color palette</span>}
        >
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Controls primary cards, secondary tags, and tertiary cards on Student, Teacher, and Group pages.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {ownerPalettePresets.map((palette) => (
                <button key={palette.id} type="button" onClick={async () => { setOwnerPalette(palette.id); saveOwnerPalette(palette.id); try { await settingsAPI.saveOwnerPalette(palette.id); showToast.success(`${palette.name} palette saved for this center.`); } catch { showToast.error('Palette applied locally, but could not be saved for other users.'); } }} className={cn('rounded-lg border-2 p-3 text-left transition', ownerPalette === palette.id ? 'border-slate-900 shadow-md dark:border-white' : 'border-slate-200 dark:border-border')}>
                  <span className="mb-2 block text-sm font-semibold">{palette.name}</span>
                  <span className="flex gap-2"><span className="h-8 flex-1 rounded" style={{ backgroundColor: palette.primary }} title="Primary cards" /><span className="h-8 flex-1 rounded" style={{ backgroundColor: palette.secondary }} title="Secondary tags" /><span className="h-8 flex-1 rounded border" style={{ backgroundColor: palette.tertiary }} title="Tertiary cards" /></span>
                </button>
              ))}
            </div>
          </div>
        </SectionPanel>

        <SectionPanel
          title={
            <span className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 text-white shadow-sm">
                <Palette className="h-4 w-4" />
              </span>
              List row colors
            </span>
          }
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryRowColor">First row color</Label>
                <Input id="primaryRowColor" type="color" value={primaryRowColor} onChange={(event) => setPrimaryRowColor(event.target.value)} className="h-11 cursor-pointer p-1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alternateRowColor">Alternate row color</Label>
                <Input id="alternateRowColor" type="color" value={alternateRowColor} onChange={(event) => setAlternateRowColor(event.target.value)} className="h-11 cursor-pointer p-1" />
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border text-sm">
              <div className="px-4 py-3" style={{ backgroundColor: primaryRowColor }}>Example first row</div>
              <div className="px-4 py-3" style={{ backgroundColor: alternateRowColor }}>Example alternate row</div>
            </div>
            <p className="text-xs text-muted-foreground">These colors apply to all table lists after saving and remain on this device.</p>
          </div>
        </SectionPanel>

        <SectionPanel
          title={
            <span className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-sm">
                <Timer className="h-4 w-4" />
              </span>
              Lesson Length
            </span>
          }
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="defaultDuration">Default lesson length (minutes)</Label>
              <Input
                id="defaultDuration"
                type="number"
                min={1}
                value={defaultDuration}
                onChange={(event) => setDefaultDuration(Number(event.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="overrideDuration">Override for next generation (minutes)</Label>
              <Input
                id="overrideDuration"
                type="number"
                min={1}
                placeholder="Leave empty to use default"
                value={overrideDuration}
                onChange={(event) => {
                  const value = event.target.value;
                  setOverrideDuration(value === '' ? '' : Number(value));
                }}
              />
              <p className="text-xs text-muted-foreground">
                Use this to temporarily override the default when generating sessions.
              </p>
            </div>

            <Button variant="outline" onClick={handleClearOverride}>
              Clear Override
            </Button>
          </div>
        </SectionPanel>

        <SectionPanel
          title={
            <span className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-sm">
                <CalendarDays className="h-4 w-4" />
              </span>
              Calendar Defaults
            </span>
          }
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Default calendar view</Label>
              <Select value={calendarDefaultView} onValueChange={(value) => setCalendarDefaultView(value as 'month' | 'week')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month view</SelectItem>
                  <SelectItem value="week">Week view</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Day starts</Label>
                <Select value={String(calendarStartHour)} onValueChange={(value) => setCalendarStartHour(Number(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Day ends</Label>
                <Select value={String(calendarEndHour)} onValueChange={(value) => setCalendarEndHour(Number(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-4 w-4" />
              Week view uses this time range for visible slots.
            </p>
            <Button variant="outline" onClick={handleResetCalendar}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Calendar Defaults
            </Button>
          </div>
        </SectionPanel>
      </div>

      <SectionPanel
        title={
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-sm">
              <Coins className="h-4 w-4" />
            </span>
            Lesson Scoring
          </span>
        }
      >
        <div className="space-y-6">
          {(['attendance', 'homework', 'activity'] as ScoreSection[]).map((section) => (
            <div key={section} className="space-y-2">
              <div className="text-sm font-semibold capitalize">{section}</div>
              <div className="overflow-x-auto rounded-lg border">
                <div className="grid min-w-[620px] grid-cols-[1.3fr_90px_90px_90px] gap-2 border-b bg-slate-50 px-3 py-2 text-xs font-semibold text-muted-foreground">
                  <span>Label</span>
                  <span>Score</span>
                  <span>Symbol</span>
                  <span>Fill %</span>
                </div>
                {lessonScoring[section].map((option, index) => (
                  <div key={`${section}-${index}`} className="grid min-w-[620px] grid-cols-[1.3fr_90px_90px_90px] gap-2 border-b px-3 py-2 last:border-b-0">
                    <Input value={option.label} onChange={(event) => updateScoreOption(section, index, 'label', event.target.value)} className="h-8" />
                    <Input type="number" value={option.score} onChange={(event) => updateScoreOption(section, index, 'score', event.target.value)} className="h-8" />
                    <Input value={option.symbol} onChange={(event) => updateScoreOption(section, index, 'symbol', event.target.value)} className="h-8" />
                    <Input type="number" min={0} max={100} value={option.fill} onChange={(event) => updateScoreOption(section, index, 'fill', event.target.value)} className="h-8" />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <div className="space-y-2">
              <Label htmlFor="stellarBonusCoins">Stellar bonus coins</Label>
              <Input
                id="stellarBonusCoins"
                type="number"
                value={lessonScoring.stellarBonusCoins}
                onChange={(event) => setLessonScoring((current) => ({ ...current, stellarBonusCoins: Number(event.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold">Coin mapping</div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {lessonScoring.coinScoreMapping.map((row, index) => (
                  <div key={`coin-${index}`} className="grid grid-cols-2 gap-2 rounded-lg border p-2">
                    <Input type="number" value={row.score} onChange={(event) => updateCoinMapping(index, 'score', event.target.value)} className="h-8" />
                    <Input type="number" value={row.coins} onChange={(event) => updateCoinMapping(index, 'coins', event.target.value)} className="h-8" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Each pair is score percent and coins awarded at or above that score.</p>
            </div>
          </div>
        </div>
      </SectionPanel>
    </div>
  );
};

export default SettingsPage;
