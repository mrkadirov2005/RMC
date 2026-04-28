// Page component for the settings screen in the crm feature.

import { useEffect, useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showToast } from '@/utils/toast';

const DEFAULT_DURATION_KEY = 'lesson_duration_default';
const OVERRIDE_DURATION_KEY = 'lesson_duration_override';

// Reads stored number.
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

// Renders the settings page screen.
const SettingsPage = () => {
  const [defaultDuration, setDefaultDuration] = useState(90);
  const [overrideDuration, setOverrideDuration] = useState<number | ''>('');

// Runs side effects for this component.
  useEffect(() => {
    setDefaultDuration(readStoredNumber(DEFAULT_DURATION_KEY, 90));
    const overrideValue = readStoredNumber(OVERRIDE_DURATION_KEY, 0);
    setOverrideDuration(overrideValue > 0 ? overrideValue : '');
  }, []);

// Handles save.
  const handleSave = () => {
    if (!Number.isFinite(defaultDuration) || defaultDuration <= 0) {
      showToast.error('Lesson length must be a positive number.');
      return;
    }

    localStorage.setItem(DEFAULT_DURATION_KEY, String(defaultDuration));
    if (overrideDuration && Number(overrideDuration) > 0) {
      localStorage.setItem(OVERRIDE_DURATION_KEY, String(overrideDuration));
    } else {
      localStorage.removeItem(OVERRIDE_DURATION_KEY);
    }
    showToast.success('Lesson settings saved.');
  };

// Handles clear override.
  const handleClearOverride = () => {
    localStorage.removeItem(OVERRIDE_DURATION_KEY);
    setOverrideDuration('');
    showToast.success('Override cleared.');
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <SettingsIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure lesson duration defaults.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lesson Length</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave}>Save Settings</Button>
            <Button variant="outline" onClick={handleClearOverride}>
              Clear Override
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
