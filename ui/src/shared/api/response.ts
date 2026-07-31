type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const getApiPayload = <T = unknown>(response: unknown): T => {
  if (isRecord(response) && 'data' in response) return response.data as T;
  return response as T;
};

export const unwrapApiRows = <T>(response: unknown): T[] => {
  const payload = getApiPayload<unknown>(response);
  if (Array.isArray(payload)) return payload as T[];
  if (!isRecord(payload)) return [];
  for (const key of ['data', 'items', 'rows', 'students']) {
    const value = payload[key];
    if (Array.isArray(value)) return value as T[];
  }
  return [];
};
