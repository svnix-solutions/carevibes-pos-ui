export function getAuthConfig() {
  const erpnextUrl = process.env.ERPNEXT_URL;
  const bridgeUrl = process.env.BRIDGE_URL;
  const clientId = process.env.POS_CLIENT_ID;
  const sessionSecret = process.env.POS_SESSION_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!erpnextUrl || !bridgeUrl || !clientId || !sessionSecret || !appUrl) {
    throw new Error(
      "Missing required env vars: ERPNEXT_URL, BRIDGE_URL, POS_CLIENT_ID, POS_SESSION_SECRET, NEXT_PUBLIC_APP_URL"
    );
  }

  return {
    erpnextUrl,
    bridgeUrl,
    clientId,
    sessionSecret,
    appUrl,
    redirectUri: `${appUrl}/auth/callback`,
    bridgeAuthorizeUrl: `${bridgeUrl}/api/bridge/authorize`,
    bridgeTokenUrl: `${bridgeUrl}/api/bridge/token`,
    erpnextExchangeUrl: `${erpnextUrl}/api/method/pos_exchange_token`,
  };
}
