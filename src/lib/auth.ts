export const ALLOWED_EMAIL_DOMAIN = "laolabuena.com";
export const SESSION_COOKIE = "bakana_session";
export const OAUTH_STATE_COOKIE = "bakana_oauth_state";

export type AuthSession = {
  email: string;
  name: string;
  picture?: string;
  exp: number;
};

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function hmac(message: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return bytesToBase64Url(new Uint8Array(signature));
}

function readSecret() {
  return process.env.AUTH_SECRET || "";
}

export function isAllowedEmail(email: string) {
  return email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}

export async function createSessionToken(session: Omit<AuthSession, "exp">, maxAgeSeconds = 60 * 60 * 8) {
  const secret = readSecret();
  if (!secret) throw new Error("Falta configurar AUTH_SECRET");

  const payload: AuthSession = {
    ...session,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds
  };
  const payloadToken = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmac(payloadToken, secret);
  return `${payloadToken}.${signature}`;
}

export async function verifySessionToken(token?: string) {
  const secret = readSecret();
  if (!secret || !token) return null;

  const [payloadToken, signature] = token.split(".");
  if (!payloadToken || !signature) return null;

  const expected = await hmac(payloadToken, secret);
  if (signature !== expected) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadToken))) as AuthSession;
    if (!payload.email || !isAllowedEmail(payload.email)) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
