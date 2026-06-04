import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "demo_takaful_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
const ADMIN_USERNAME = "admin";

function getAdminPassword(): string {
  const date = new Date();
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `admin${dd}${mm}${yyyy}!`;
}

interface SessionPayload {
  sub: "admin";
  iat: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is required for session signing.");
  }

  return secret;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(encodedPayload: string): string {
  return createHmac("sha256", getJwtSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function verifySignature(signature: string, expectedSignature: string): boolean {
  const signatureBuffer = Buffer.from(signature, "base64url");
  const expectedBuffer = Buffer.from(expectedSignature, "base64url");

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer);
}

function createSessionToken(): string {
  const payload: SessionPayload = {
    sub: "admin",
    iat: Math.floor(Date.now() / 1000),
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function isValidSessionToken(token: string | undefined): boolean {
  if (!token) {
    return false;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = signPayload(encodedPayload);

  if (!verifySignature(signature, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);

    return payload.sub === "admin" && now - payload.iat <= SESSION_MAX_AGE_SECONDS;
  } catch {
    return false;
  }
}

export async function createSession(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export function validateLoginCredentials(credentials: LoginCredentials): boolean {
  return (
    credentials.username.trim() === ADMIN_USERNAME &&
    credentials.password === getAdminPassword()
  );
}
