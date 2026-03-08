# ERPNext Server Script - Token Exchange for CareVibes POS
#
# Create this in ERPNext at: /app/server-script/new
#
# Settings:
#   Script Type: API
#   API Method: pos_exchange_token
#   Allow Guest: Yes (checked)
#
# This makes the endpoint available at:
#   POST /api/method/pos_exchange_token
#
# After creating, the POS app calls this endpoint with a Supabase access_token
# and receives an ERPNext OAuth Bearer Token in return.
#
# ------- Paste everything below this line into the Script field -------

import requests as req

supabase_token = frappe.form_dict.get("supabase_token")
if not supabase_token:
    frappe.throw("Missing supabase_token", frappe.AuthenticationError)

# Validate Supabase token against the bridge's userinfo endpoint
bridge_url = "https://carevibes-auth.netlify.app/api/bridge/userinfo"
try:
    resp = req.get(
        bridge_url,
        headers={"Authorization": f"Bearer {supabase_token}"},
        timeout=10,
    )
except Exception:
    frappe.throw("Failed to validate token with auth bridge", frappe.AuthenticationError)

if resp.status_code != 200:
    frappe.throw("Invalid or expired Supabase token", frappe.AuthenticationError)

user_info = resp.json()
email = user_info.get("email")

if not email:
    frappe.throw("No email found in token", frappe.AuthenticationError)

if not frappe.db.exists("User", email):
    frappe.throw(f"User {email} not found in ERPNext", frappe.AuthenticationError)

# Create an ERPNext OAuth Bearer Token (8 hours = POS shift)
access_token = frappe.generate_hash(length=40)

bearer = frappe.get_doc({
    "doctype": "OAuth Bearer Token",
    "access_token": access_token,
    "user": email,
    "scopes": "all openid",
    "expiration_time": frappe.utils.add_to_date(frappe.utils.now_datetime(), hours=8),
    "status": "Active",
})
bearer.insert(ignore_permissions=True)
frappe.db.commit()

frappe.response["message"] = {
    "access_token": access_token,
    "expires_in": 28800,
    "token_type": "Bearer",
    "email": email,
    "full_name": frappe.db.get_value("User", email, "full_name"),
}
