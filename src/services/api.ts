const API_BASE = import.meta.env.PROD
  ? "https://dealmaker-api.bbq-durian.workers.dev"
  : "";

export class ApiError extends Error {
  status: number;
  requestId?: string;

  constructor(message: string, status: number, requestId?: string) {
    super(message);
    this.status = status;
    this.requestId = requestId;
  }
}

function getToken(): string | null {
  try {
    const raw = localStorage.getItem("dm_token");
    if (raw && raw.startsWith("eyJ")) return raw;
  } catch {}
  return null;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set("content-type", "application/json");

  const token = getToken();
  if (token) headers.set("authorization", "Bearer " + token);

  const response = await fetch(API_BASE + path, { ...init, headers });
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) {
    throw new ApiError(
      payload.error ?? `API request failed with ${response.status}`,
      response.status,
      response.headers.get("x-request-id") ?? undefined,
    );
  }
  return payload;
}
