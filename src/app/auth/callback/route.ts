import { NextRequest, NextResponse } from "next/server";
import { getAuthConfig } from "@/lib/auth/config";
import { getAndClearState, setSessionCookie } from "@/lib/auth/cookies";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const config = getAuthConfig();
  const appUrl = config.appUrl;

  // Handle errors from the bridge
  if (error) {
    return NextResponse.redirect(
      `${appUrl}/login?error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/login?error=missing_params`);
  }

  // Validate state
  const savedState = await getAndClearState();
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${appUrl}/login?error=invalid_state`);
  }

  try {
    // Step 1: Exchange bridge_code for Supabase tokens
    const bridgeTokenRes = await fetch(config.bridgeTokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!bridgeTokenRes.ok) {
      const errorText = await bridgeTokenRes.text();
      console.error("Bridge token exchange failed:", errorText);
      return NextResponse.redirect(`${appUrl}/login?error=bridge_token_failed`);
    }

    const bridgeTokens = await bridgeTokenRes.json();
    const supabaseAccessToken = bridgeTokens.access_token;

    if (!supabaseAccessToken) {
      return NextResponse.redirect(
        `${appUrl}/login?error=no_supabase_token`
      );
    }

    // Step 2: Exchange Supabase token for ERPNext Bearer Token
    const exchangeRes = await fetch(config.erpnextExchangeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supabase_token: supabaseAccessToken }),
    });

    if (!exchangeRes.ok) {
      const errorText = await exchangeRes.text();
      console.error("ERPNext token exchange failed:", errorText);
      return NextResponse.redirect(
        `${appUrl}/login?error=erpnext_exchange_failed`
      );
    }

    const erpnextTokens = await exchangeRes.json();
    const tokenData = erpnextTokens.message || erpnextTokens;

    // Step 3: Store session in encrypted cookie
    await setSessionCookie({
      erpnext_access_token: tokenData.access_token,
      expires_at: Math.floor(Date.now() / 1000) + (tokenData.expires_in || 28800),
      user_email: tokenData.email,
      user_full_name: tokenData.full_name || tokenData.email,
    });

    // Redirect to billing page
    return NextResponse.redirect(`${appUrl}/billing`);
  } catch (err) {
    console.error("Auth callback error:", err);
    return NextResponse.redirect(`${appUrl}/login?error=callback_failed`);
  }
}
