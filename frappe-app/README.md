# CareVibes POS - Frappe App

Minimal Frappe app that provides a token exchange endpoint for the CareVibes POS UI.

## What it does

Exposes `POST /api/method/carevibes_pos.api.exchange_token` which:

1. Accepts a Supabase `access_token`
2. Validates it against the carevibes-auth-ui bridge's `/api/bridge/userinfo` endpoint
3. Finds the matching ERPNext user by email
4. Creates an OAuth Bearer Token (8-hour expiry) for that user
5. Returns the Bearer token for ERPNext API access

## Installation

```bash
bench get-app /path/to/frappe-app
bench --site your-site install-app carevibes_pos
```

## Configuration

Add to your site's `site_config.json` (optional):

```json
{
  "bridge_userinfo_url": "https://carevibes-auth.netlify.app/api/bridge/userinfo"
}
```

If not set, defaults to `https://carevibes-auth.netlify.app/api/bridge/userinfo`.
