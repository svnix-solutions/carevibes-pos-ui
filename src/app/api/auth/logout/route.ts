import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth/cookies";
import { getAuthConfig } from "@/lib/auth/config";

export async function GET() {
  await clearSession();

  const config = getAuthConfig();
  const logoutUrl = new URL(`${config.bridgeUrl}/api/bridge/logout`);
  logoutUrl.searchParams.set(
    "post_logout_redirect_uri",
    `${config.appUrl}/login`
  );

  return NextResponse.redirect(logoutUrl.toString());
}
