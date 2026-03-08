# CareVibes POS - ERPNext Token Exchange

## Quick Setup: Server Script (Recommended)

Create a Server Script in ERPNext admin. No app deployment needed.

### Steps

1. Go to `https://carevibes.m.frappe.cloud/app/server-script/new`

2. Fill in the fields:
   - **Script Type**: API
   - **API Method**: `pos_exchange_token`
   - **Allow Guest**: checked (yes)

3. Copy the script body from [server-script.py](./server-script.py) into the **Script** field
   (everything below the "Paste everything below" comment)

4. Save

The endpoint will be available at:
```
POST https://carevibes.m.frappe.cloud/api/method/pos_exchange_token
```

### What it does

1. Accepts a Supabase `access_token` in the request body
2. Validates it against carevibes-auth-ui's `/api/bridge/userinfo` endpoint
3. Finds the matching ERPNext user by email
4. Creates an OAuth Bearer Token (8-hour expiry) for that user
5. Returns the Bearer token for ERPNext API access

### Test it

```bash
curl -X POST https://carevibes.m.frappe.cloud/api/method/pos_exchange_token \
  -H "Content-Type: application/json" \
  -d '{"supabase_token": "YOUR_SUPABASE_ACCESS_TOKEN"}'
```

---

## Alternative: Custom Frappe App

If you prefer a custom app (for version control, testing, etc.), see [carevibes_pos/api.py](./carevibes_pos/api.py). Install with:

```bash
bench get-app /path/to/frappe-app
bench --site your-site install-app carevibes_pos
```
