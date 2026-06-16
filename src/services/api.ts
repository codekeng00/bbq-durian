export class ApiError extends Error {
  status: number;
  requestId?: string;

  constructor(
    message: string,
    status: number,
    requestId?: string,
  ) {
    super(message);
    this.status = status;
    this.requestId = requestId;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set("content-type", "application/json");

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "same-origin",
  });
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
