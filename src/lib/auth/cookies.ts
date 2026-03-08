import { cookies } from "next/headers";
import crypto from "crypto";

export interface SessionData {
  erpnext_access_token: string;
  expires_at: number;
  user_email: string;
  user_full_name: string;
}

const SESSION_COOKIE = "pos_session";
const STATE_COOKIE = "pos_oauth_state";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getSecretKey(): Buffer {
  const secret = process.env.POS_SESSION_SECRET;
  if (!secret) throw new Error("POS_SESSION_SECRET not configured");
  return Buffer.from(secret, "hex");
}

export function encrypt(data: string): string {
  const key = getSecretKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(data, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const tag = cipher.getAuthTag();

  // Format: iv:tag:encrypted (all hex)
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(encryptedData: string): string {
  const key = getSecretKey();
  const parts = encryptedData.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted data format");

  const iv = Buffer.from(parts[0], "hex");
  const tag = Buffer.from(parts[1], "hex");
  const encrypted = Buffer.from(parts[2], "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString("utf8");
}

export async function setSessionCookie(session: SessionData): Promise<void> {
  const cookieStore = await cookies();
  const encrypted = encrypt(JSON.stringify(session));
  cookieStore.set(SESSION_COOKIE, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60, // 8 hours (POS shift)
  });
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE);
  if (!cookie?.value) return null;

  try {
    const decrypted = decrypt(cookie.value);
    const session: SessionData = JSON.parse(decrypted);

    // Check expiry
    if (session.expires_at && Date.now() / 1000 > session.expires_at) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function setStateCookie(state: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });
}

export async function getAndClearState(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(STATE_COOKIE);
  if (!cookie?.value) return null;
  cookieStore.delete(STATE_COOKIE);
  return cookie.value;
}
