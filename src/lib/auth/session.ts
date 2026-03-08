import { NextRequest } from "next/server";
import { decrypt, type SessionData } from "./cookies";

const SESSION_COOKIE = "pos_session";

export function getSessionFromRequest(request: NextRequest): SessionData | null {
  const cookie = request.cookies.get(SESSION_COOKIE);
  if (!cookie?.value) return null;

  try {
    const decrypted = decrypt(cookie.value);
    const session: SessionData = JSON.parse(decrypted);

    if (session.expires_at && Date.now() / 1000 > session.expires_at) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}
