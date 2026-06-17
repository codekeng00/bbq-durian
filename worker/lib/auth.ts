import { HttpError } from "./http";
import type { AuthenticatedUser, Env, Team } from "../types";

const SESSION_COOKIE = "dealmaker_dev_session";
const encoder = new TextEncoder();
const LOCAL_ONLY_SECRET = "dealmaker-localhost-session-secret-not-for-production";

type UserRow = {
  id: string;
  organization_id: string;
  organization_name: string;
  email: string;
  name: string;
  team: Team;
  can_approve_high_risk: number;
};

type AccessJwtPayload = {
  aud?: string | string[];
  email?: string;
  exp?: number;
  iss?: string;
};

function toUser(row: UserRow): AuthenticatedUser {
  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    email: row.email,
    name: row.name,
    team: row.team,
    canApproveHighRisk: row.can_approve_high_risk === 1,
  };
}

async function findUser(env: Env, email: string): Promise<AuthenticatedUser | null> {
  const row = await env.DB.prepare(
    `SELECT users.id, users.organization_id, organizations.name AS organization_name,
      users.email, users.name, users.team, users.can_approve_high_risk
     FROM users
     JOIN organizations ON organizations.id = users.organization_id
     WHERE lower(users.email) = lower(?) AND users.active = 1`,
  )
    .bind(email)
    .first<UserRow>();
  return row ? toUser(row) : null;
}

function isLocal(request: Request): boolean {
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function decodeJson<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as T;
}

function constantTimeEqual(left: ArrayBuffer, right: ArrayBuffer): boolean {
  const leftBytes = new Uint8Array(left);
  const rightBytes = new Uint8Array(right);
  if (leftBytes.length !== rightBytes.length) return false;
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

async function signature(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))));
}

function cookieValue(request: Request, name: string): string | undefined {
  const cookies = request.headers.get("cookie") ?? "";
  return cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function devAuthEnabled(request: Request, env: Env): boolean {
  return isLocal(request) && env.DEV_AUTH_ENABLED === "true";
}

function devSessionSecret(request: Request, env: Env): string {
  if (!devAuthEnabled(request, env)) {
    throw new HttpError(404, "Development login is not enabled.");
  }
  return env.AUTH_SECRET && env.AUTH_SECRET.length >= 32
    ? env.AUTH_SECRET
    : LOCAL_ONLY_SECRET;
}

export async function createDevSession(
  request: Request,
  env: Env,
  team: Team,
): Promise<{ user: AuthenticatedUser; cookie: string }> {
  if (!devAuthEnabled(request, env)) {
    throw new HttpError(404, "Development login is not enabled.");
  }
  const email = team === "sales" ? "alice@dealmaker.com" : "bob@dealmaker.com";
  const user = await findUser(env, email);
  if (!user) throw new HttpError(403, "Development user is not configured.");
  const secret = devSessionSecret(request, env);
  const payload = base64Url(encoder.encode(JSON.stringify({
    email: user.email,
    expiresAt: Date.now() + 8 * 60 * 60 * 1000,
  })));
  const signed = `${payload}.${await signature(secret, payload)}`;
  return {
    user,
    cookie: `${SESSION_COOKIE}=${signed}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`,
  };
}

async function localSessionUser(request: Request, env: Env): Promise<AuthenticatedUser | null> {
  if (!devAuthEnabled(request, env)) return null;
  const secret = devSessionSecret(request, env);
  const value = cookieValue(request, SESSION_COOKIE);
  if (!value) return null;
  const [payload, providedSignature] = value.split(".");
  if (!payload || !providedSignature) return null;
  const expectedSignature = await signature(secret, payload);
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(providedSignature)),
    crypto.subtle.digest("SHA-256", encoder.encode(expectedSignature)),
  ]);
  if (!constantTimeEqual(providedHash, expectedHash)) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload))) as {
      email?: string;
      expiresAt?: number;
    };
    if (!parsed.email || !parsed.expiresAt || parsed.expiresAt < Date.now()) return null;
    return findUser(env, parsed.email);
  } catch {
    return null;
  }
}

export async function optionalUser(
  request: Request,
  env: Env,
): Promise<AuthenticatedUser | null> {
  const localUser = await localSessionUser(request, env);
  if (localUser) return localUser;

  const email = request.headers.get("cf-access-authenticated-user-email");
  const assertion = request.headers.get("cf-access-jwt-assertion");
  if (!email || !assertion) return null;
  await verifyAccessAssertion(env, assertion, email);
  return findUser(env, email);
}

async function verifyAccessAssertion(
  env: Env,
  assertion: string,
  headerEmail: string,
): Promise<void> {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
    throw new HttpError(503, "Cloudflare Access verification is not configured.");
  }
  const parts = assertion.split(".");
  if (parts.length !== 3) throw new HttpError(401, "Invalid Access assertion.");
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJson<{ alg?: string; kid?: string }>(encodedHeader);
  const payload = decodeJson<AccessJwtPayload>(encodedPayload);
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  const expectedIssuer = `https://${env.ACCESS_TEAM_DOMAIN}`;
  if (
    header.alg !== "RS256" ||
    !header.kid ||
    payload.iss !== expectedIssuer ||
    !audiences.includes(env.ACCESS_AUD) ||
    !payload.exp ||
    payload.exp * 1000 <= Date.now() ||
    payload.email?.toLowerCase() !== headerEmail.toLowerCase()
  ) {
    throw new HttpError(401, "Access assertion claims are invalid.");
  }

  const certResponse = await fetch(
    `${expectedIssuer}/cdn-cgi/access/certs`,
    { cf: { cacheTtl: 300, cacheEverything: true } },
  );
  if (!certResponse.ok) {
    throw new HttpError(503, "Cloudflare Access certificates are unavailable.");
  }
  const certs = (await certResponse.json()) as {
    keys?: Array<JsonWebKey & { kid?: string }>;
  };
  const jwk = certs.keys?.find((key) => key.kid === header.kid);
  if (!jwk) throw new HttpError(401, "Access signing key was not found.");
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    decodeBase64Url(encodedSignature),
    encoder.encode(`${encodedHeader}.${encodedPayload}`),
  );
  if (!valid) throw new HttpError(401, "Access assertion signature is invalid.");
}

export async function requireUser(
  request: Request,
  env: Env,
  allowedTeam?: Team,
): Promise<AuthenticatedUser> {
  const user = await optionalUser(request, env);
  if (!user) throw new HttpError(401, "Authentication is required.");
  if (allowedTeam && user.team !== allowedTeam) {
    throw new HttpError(403, `${allowedTeam} role required.`);
  }
  return user;
}

export function clearDevSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}
