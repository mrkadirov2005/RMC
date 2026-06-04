// Page component for the settings screen in the crm feature.

import { useEffect, useState } from 'react';
import { CalendarDays, Clock, RotateCcw, Save, Settings as SettingsIcon, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showToast } from '@/utils/toast';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionPanel } from '@/components/common/SectionPanel';
import {
  CALENDAR_DAY_END_HOUR_KEY,
  CALENDAR_DAY_START_HOUR_KEY,
  CALENDAR_DEFAULT_VIEW_KEY,
} from '../calendar/utils';

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

// Renders the settings page screen.
const SettingsPage = () => {
  const [defaultDuration, setDefaultDuration] = useState(90);
  const [overrideDuration, setOverrideDuration] = useState<number | ''>('');
  const [calendarDefaultView, setCalendarDefaultView] = useState<'month' | 'week'>('month');
  const [calendarStartHour, setCalendarStartHour] = useState(8);
  const [calendarEndHour, setCalendarEndHour] = useState(18);

  useEffect(() => {
    setDefaultDuration(readStoredNumber(DEFAULT_DURATION_KEY, 90));
    const overrideValue = readStoredNumber(OVERRIDE_DURATION_KEY, 0);
    setOverrideDuration(overrideValue > 0 ? overrideValue : '');
    setCalendarDefaultView(readStoredView());
    setCalendarStartHour(readStoredHour(CALENDAR_DAY_START_HOUR_KEY, 8));
    setCalendarEndHour(readStoredHour(CALENDAR_DAY_END_HOUR_KEY, 18));
  }, []);

  const handleSave = () => {
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
    showToast.success('Settings saved.');
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
    setDefaultDuration(90);
    setOverrideDuration('');
    setCalendarDefaultView('month');
    setCalendarStartHour(8);
    setCalendarEndHour(18);
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

      <div className="grid gap-6 lg:grid-cols-2">
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
    </div>
  );
};

export default SettingsPage;
