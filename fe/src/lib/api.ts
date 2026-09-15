const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
).replace(/\/$/, '');

type Envelope<T> = { data: T; message?: string | string[] };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  const body = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!response.ok) {
    const raw = body?.message;
    throw new ApiError(
      Array.isArray(raw) ? raw.join(', ') : raw || 'Request failed',
      response.status,
      body?.data,
    );
  }
  return body?.data as T;
}

export const request = {
  get: <T>(path: string) => api<T>(path),
  post: <T>(path: string, body?: unknown, headers?: HeadersInit) =>
    api<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
      headers,
    }),
  patch: <T>(path: string, body?: unknown) =>
    api<T>(path, {
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T>(path: string) => api<T>(path, { method: 'DELETE' }),
};

export function apiBaseUrl() {
  return API_URL;
}
