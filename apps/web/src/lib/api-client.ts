const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly message: string,
    public readonly data?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const activeToken = token || localStorage.getItem('lf_access_token');
  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage =
      (typeof data === 'object' && data !== null && (data.message || data.error)) ||
      response.statusText ||
      'Network request failed';
    throw new ApiError(response.status, Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage, data);
  }

  return data as T;
}

export const apiClient = {
  get: <T>(endpoint: string, token?: string | null) =>
    request<T>(endpoint, { method: 'GET' }, token),

  post: <T>(endpoint: string, body?: any, token?: string | null) =>
    request<T>(
      endpoint,
      {
        method: 'POST',
        body: body instanceof FormData ? body : JSON.stringify(body),
      },
      token,
    ),

  patch: <T>(endpoint: string, body?: any, token?: string | null) =>
    request<T>(
      endpoint,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
      token,
    ),

  delete: <T>(endpoint: string, token?: string | null) =>
    request<T>(endpoint, { method: 'DELETE' }, token),
};
