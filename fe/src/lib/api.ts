const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
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

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
  retried = false,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  const body = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (
    response.status === 401 &&
    !retried &&
    !path.startsWith('/auth/login') &&
    !path.startsWith('/auth/refresh') &&
    !path.startsWith('/auth/register') &&
    !path.startsWith('/auth/logout')
  ) {
    const refreshed = await tryRefreshSession();
    if (refreshed) return api<T>(path, init, true);
  }
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
  put: <T>(path: string, body?: unknown) =>
    api<T>(path, {
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T>(path: string, body?: unknown) =>
    api<T>(path, {
      method: 'DELETE',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
};

export function apiBaseUrl() {
  return API_URL;
}
