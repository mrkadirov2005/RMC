// Share link calls for the Tests feature. Components reach the server through
// this layer rather than importing the shared client directly.

import { testAPI } from '@/shared/api/api';
import { getApiPayload } from '@/shared/api/response';

export const testShareApi = {
  create: async (testId: number) =>
    getApiPayload<{ share_token: string }>(await testAPI.createShareLink(testId)),

  revoke: async (testId: number) => {
    await testAPI.revokeShareLink(testId);
  },
};
