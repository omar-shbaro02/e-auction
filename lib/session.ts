import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const sessionCookieName = "weeklybids-session";
const sessionDurationSeconds = 60 * 60 * 12;

type SessionPayload = {
  email: string;
  fullName: string;
  role: "buyer" | "admin";
  exp: number;
};

function getSessionSecret() {
  return process.env.SESSION_SECRET || "development-session-secret-change-me";
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

export function createSessionToken(payload: Omit<SessionPayload, "exp">) {
  const body = encodeBase64Url(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + sessionDurationSeconds
    } satisfies SessionPayload)
  );

  return `${body}.${signValue(body)}`;
}

export function readSessionToken(token?: string | null) {
  if (!token) {
    return null;
  }

  const [body, signature] = token.split(".");

  if (!body || !signature) {
    return null;
  }

  const expected = signValue(body);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(body)) as SessionPayload;

    if (!payload.email || !payload.fullName || !payload.role || payload.exp * 1000 < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getServerSession() {
  const cookieStore = await cookies();
  return readSessionToken(cookieStore.get(sessionCookieName)?.value);
}

export function getSessionCookieName() {
  return sessionCookieName;
}

