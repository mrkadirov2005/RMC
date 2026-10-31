jest.mock('@sentry/react-native', () => ({ init: jest.fn(), setTag: jest.fn(), captureException: jest.fn(), wrap: (c: unknown) => c }));
jest.mock('../../config', () => ({ APP_VERSION: '1.0.0' }));

import { scrubEvent, scrubText } from '../crash';

// @MOB-107 Crash reports never carry personal data.
describe('crash report scrubbing', () => {
  it('masks e-mails, phone numbers, tokens and URL query strings', () => {
    expect(scrubText('Failed for ali@example.com on +998 90 123 45 67')).toBe('Failed for [email] on [number]');
    expect(scrubText('Authorization: Bearer eyJabc.def-ghi')).toBe('Authorization: Bearer [token]');
    expect(scrubText('GET https://api.example.com/api/media-local/x.m4a?op=get&sig=abc failed')).toBe('GET https://api.example.com/api/media-local/x.m4a?[query] failed');
    expect(scrubText('lesson 12 at 14:00')).toBe('lesson 12 at 14:00');
  });

  it('drops the user, request headers and body, and filters personal fields anywhere', () => {
    const event = scrubEvent({
      user: { id: 7, username: 'aziza' },
      request: { url: 'https://api/x?token=1', headers: { Authorization: 'Bearer x' }, data: { password: 'p' } },
      extra: { first_name: 'Aziza', phone: '901234567', screen: 'homework', nested: { refresh_token: 'r', note: 'call 998901234567' } },
    });
    expect(event.user).toBeUndefined();
    expect(event.request).toEqual({ url: 'https://api/x?[query]' });
    expect(event.extra).toEqual({ first_name: '[filtered]', phone: '[filtered]', screen: 'homework', nested: { refresh_token: '[filtered]', note: 'call [number]' } });
  });
});
