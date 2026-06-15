import { z } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export async function readJson<T>(
  request: Request,
  schema: z.ZodType<T>,
  maxBytes = 1_000_000,
): Promise<T> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new HttpError(413, "Request body is too large.");
  }
  try {
    const text = await request.text();
    if (text.length > maxBytes) throw new HttpError(413, "Request body is too large.");
    const result = schema.safeParse(JSON.parse(text));
    if (!result.success) {
      const issue = result.error.issues[0];
      throw new HttpError(
        400,
        issue ? `${issue.path.join(".") || "request"}: ${issue.message}` : "Invalid request.",
      );
    }
    return result.data;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return json({ error: error.message }, { status: error.status });
  }

  console.error(JSON.stringify({
    message: "Unhandled Worker error",
    error: error instanceof Error ? error.message : String(error),
  }));
  return json({ error: "Unexpected server error." }, { status: 500 });
}

export function routeParam(pathname: string, pattern: RegExp): string | undefined {
  return pathname.match(pattern)?.[1];
}
