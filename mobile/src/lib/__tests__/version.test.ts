import { compareVersions, updateState, type AppConfig } from '../version';

const config = (min: string, latest: string | null): AppConfig => ({
  api_version: 'v1',
  min_app_version: min,
  latest_version: latest,
  download_url: latest ? 'https://drive.google.com/uc?export=download&id=X' : null,
  release_notes: null,
  released_at: null,
});

// @MOB-175
describe('app version check', () => {
  it('compares versions by number', () => {
    expect(compareVersions('1.2.10', '1.2.9')).toBe(1);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.0', '1.1.0')).toBe(-1);
  });

  it('requires an update below the minimum and reminds below the newest', () => {
    expect(updateState('1.0.0', config('1.1.0', '1.2.0'))).toBe('required');
    expect(updateState('1.1.0', config('1.1.0', '1.2.0'))).toBe('available');
    expect(updateState('1.2.0', config('1.1.0', '1.2.0'))).toBe('none');
    expect(updateState('1.0.0', config('1.0.0', null))).toBe('none');
    expect(updateState('1.0.0', null)).toBe('none');
  });

  it('a dismissed reminder stays hidden until a newer version comes out', () => {
    expect(updateState('1.1.0', config('1.0.0', '1.2.0'), '1.2.0')).toBe('none');
    expect(updateState('1.1.0', config('1.0.0', '1.3.0'), '1.2.0')).toBe('available');
    // A required update cannot be dismissed.
    expect(updateState('1.0.0', config('1.1.0', '1.2.0'), '1.2.0')).toBe('required');
  });
});
