// @MOB-172 Public page for installing the Android app from the website (no store listing):
// /#/app. The button goes through the backend's stable download link, so it always gives the
// newest APK published under Mobile app → App versions.

import { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { buildApiUrl } from '@/shared/api/api';
import { useLanguage } from '@/i18n/LanguageContext';

type AppConfig = { latest_version: string | null; release_notes: string | null; released_at: string | null };

const AppDownloadPage = () => {
  const { t } = useLanguage();
  const [config, setConfig] = useState<AppConfig | null | 'error'>(null);

  useEffect(() => {
    fetch(buildApiUrl('mobile/v1/app-config'))
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data: AppConfig) => setConfig(data))
      .catch(() => setConfig('error'));
  }, []);

  const ready = config && config !== 'error' && config.latest_version;
  const steps = [
    t('Tap "Download" and wait for the file to finish.'),
    t('Open the downloaded file. If the phone asks, allow installing apps from this source.'),
    t('Tap "Install", then open TEMURBEK SCHOOL.'),
    t('Sign in with the login and password you got from the center.'),
  ];

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-8">
      <div className="mx-auto grid max-w-md gap-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <img src="/temurbek-school-logo.jpg" alt="" className="h-20 w-20 rounded-2xl object-cover shadow" />
          <h1 className="text-2xl font-bold">TEMURBEK SCHOOL</h1>
          <p className="text-sm text-muted-foreground">{t('The app for students and parents: lessons, homework, grades and payments.')}</p>
        </div>

        <Card>
          <CardContent className="grid gap-3 pt-5 text-center">
            {config === null && <p className="text-sm text-muted-foreground">…</p>}
            {config === 'error' && <p className="text-sm text-destructive">{t('Could not load the data.')}</p>}
            {config && config !== 'error' && !config.latest_version && (
              <p className="text-sm text-muted-foreground">{t('The app is not available for download yet.')}</p>
            )}
            {ready && (
              <>
                <a
                  href={buildApiUrl('mobile/v1/download')}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Download className="h-5 w-5" />
                  {t('Download for Android')}
                </a>
                <span className="text-xs text-muted-foreground">
                  {t('Version {version}', { version: config.latest_version as string })}
                  {config.released_at ? ` · ${new Date(config.released_at).toLocaleDateString('en-GB')}` : ''}
                </span>
                {config.release_notes && <p className="whitespace-pre-wrap text-left text-sm">{config.release_notes}</p>}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-3 pt-5">
            <div className="flex items-center gap-2 font-semibold">
              <Smartphone className="h-5 w-5" />
              {t('How to install')}
            </div>
            <ol className="grid list-decimal gap-2 pl-5 text-sm">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="text-xs text-muted-foreground">{t('The iPhone version is not available yet.')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AppDownloadPage;
