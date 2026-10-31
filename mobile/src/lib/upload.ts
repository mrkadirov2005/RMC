import { ApiError, api } from '../api/client';
import type { MediaFile } from '../api/types';

type Started = { media: MediaFile; upload: { url: string; method: 'PUT'; headers: Record<string, string>; expires_in: number } };
type Deps = { request: typeof api.request; fetchFn: typeof fetch; wait: (ms: number) => Promise<void> };

const defaultDeps: Deps = {
  request: (path, init) => api.request(path, init),
  fetchFn: (...args) => fetch(...args),
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

const RETRIES = 4;
const backoff = (attempt: number) => Math.min(8000, 800 * 2 ** attempt);

// Server answers that will not change on a retry (too big, wrong type).
const isFinal = (error: unknown) => error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429;

const retry = async <T,>(work: () => Promise<T>, deps: Deps, shouldRetry: (error: unknown) => boolean = (e) => !isFinal(e)) => {
  let last: unknown;
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      last = error;
      if (!shouldRetry(error) || attempt === RETRIES) break;
      await deps.wait(backoff(attempt));
    }
  }
  throw last;
};

// @MOB-143 @MOB-055 Uploads a local file (a recording, photo or PDF): asks for a signed URL, PUTs
// the bytes and confirms. Each step retries with growing pauses after a network loss; the signed
// URL is reused, so a retry never creates a second file. Returns the finished media row.
export async function uploadFile(
  file: { uri: string; contentType: string; name?: string | null },
  onProgress?: (stage: 'preparing' | 'uploading' | 'checking') => void,
  deps: Deps = defaultDeps,
): Promise<MediaFile> {
  onProgress?.('preparing');
  const blob = await (await deps.fetchFn(file.uri)).blob();
  const contentType = (file.contentType || blob.type || '').split(';')[0].toLowerCase();
  const started = await retry(
    () =>
      deps.request<Started>('/media/uploads', {
        method: 'POST',
        body: JSON.stringify({ purpose: 'homework', content_type: contentType, size_bytes: blob.size, file_name: file.name ?? null }),
      }),
    deps,
  );

  onProgress?.('uploading');
  await retry(async () => {
    let response: Response;
    try {
      response = await deps.fetchFn(started.upload.url, { method: 'PUT', headers: started.upload.headers, body: blob });
    } catch {
      throw new ApiError(0, 'NETWORK', 'NETWORK');
    }
    if (!response.ok) throw new ApiError(response.status, `upload failed (${response.status})`);
  }, deps);

  onProgress?.('checking');
  // NOT_UPLOADED can be a storage delay: worth another try. Anything else final is final.
  return retry(
    () => deps.request<MediaFile>(`/media/${started.media.media_id}/complete`, { method: 'POST' }),
    deps,
    (e) => !isFinal(e) || (e instanceof ApiError && e.code === 'NOT_UPLOADED'),
  );
}

// @MOB-143 A short-lived link to play or open one of the student's own files.
export const mediaLink = (mediaId: number) => api.request<MediaFile & { url: string }>(`/media/${mediaId}`);
