// @MOB-175 Update check for an app installed from the website (no store to push updates).

export type AppConfig = {
  api_version: string;
  min_app_version: string;
  latest_version: string | null;
  download_url: string | null;
  release_notes: string | null;
  released_at: string | null;
};

export type UpdateState = 'required' | 'available' | 'none';

const parts = (v: string | null | undefined) => (/^\d+\.\d+\.\d+$/.test(String(v ?? '')) ? String(v).split('.').map(Number) : [0, 0, 0]);

// "1.2.10" is newer than "1.2.9".
export const compareVersions = (a: string | null | undefined, b: string | null | undefined) => {
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
};

// Below the minimum: must update. Below the newest: a reminder, unless dismissed for that version.
export const updateState = (current: string, config: AppConfig | null | undefined, dismissedVersion?: string | null): UpdateState => {
  if (!config) return 'none';
  if (compareVersions(current, config.min_app_version) < 0) return 'required';
  if (config.latest_version && compareVersions(current, config.latest_version) < 0 && dismissedVersion !== config.latest_version) return 'available';
  return 'none';
};
