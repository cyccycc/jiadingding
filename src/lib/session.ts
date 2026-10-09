export const SESSION_COOKIE = "jdd_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

type SessionPayload = {
  uid: string;
  exp: number;
};

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function sign(secret: string, data: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return bytesToBase64Url(new Uint8Array(signature));
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

export function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) return null;
  return secret;
}

export async function signSession(userId: string, secret: string, now = Date.now()) {
  const payload: SessionPayload = { uid: userId, exp: now + SESSION_TTL_MS };
  const body = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await sign(secret, body);
  return `${body}.${signature}`;
}

export async function verifySession(token: string, secret: string, now = Date.now()) {
  const [body, signature] = token.split(".");
  if (!body || !signature || token.split(".").length !== 2) return null;
  const expected = await sign(secret, body);
  if (!safeEqual(expected, signature)) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body))) as SessionPayload;
    if (typeof payload.uid !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < now) return null;
    return { uid: payload.uid };
  } catch {
    return null;
  }
}

export function safeNextPath(input: string | null | undefined) {
  if (!input || !input.startsWith("/") || input.startsWith("//") || input.includes("\\")) {
    return "/dashboard";
  }
  return input;
}
