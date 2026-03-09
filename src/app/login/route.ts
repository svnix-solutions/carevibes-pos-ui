import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthConfig } from "@/lib/auth/config";
import { setStateCookie } from "@/lib/auth/cookies";

export async function GET() {
  const config = getAuthConfig();

  // Generate random state for CSRF protection
  const state = crypto.randomBytes(32).toString("hex");
  await setStateCookie(state);

  // Build the bridge authorize URL
  const authorizeUrl = new URL(config.bridgeAuthorizeUrl);
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set("redirect_uri", config.redirectUri);
  authorizeUrl.searchParams.set("state", state);

  // Redirect to carevibes-auth-ui bridge (Supabase login)
  return NextResponse.redirect(authorizeUrl.toString());
}
