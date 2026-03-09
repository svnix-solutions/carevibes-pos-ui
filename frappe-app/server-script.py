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
# Prerequisites:
#   1. OAuth Client "CareVibes POS" (client_id: 26jdbskjl9) created in ERPNext
#   2. Bridge userinfo endpoint accessible at carevibes-auth.netlify.app
#
# After creating, the POS app calls this endpoint with a Supabase access_token
# and receives an ERPNext OAuth Bearer Token in return.
#
# RestrictedPython notes:
#   - No import statements allowed
#   - Use frappe.utils.generate_hash (NOT frappe.generate_hash)
#   - Use frappe.make_get_request (NOT requests.get)
#   - No isinstance/hasattr/type builtins
#   - Use string concatenation (NOT f-strings with complex expressions)
#
# ------- Paste everything below this line into the Script field -------

supabase_token = frappe.form_dict.get("supabase_token")
if not supabase_token:
    frappe.throw("Missing supabase_token", frappe.AuthenticationError)

bridge_url = "https://carevibes-auth.netlify.app/api/bridge/userinfo"
try:
    user_info = frappe.make_get_request(
        bridge_url,
        headers={"Authorization": "Bearer " + supabase_token},
    )
except Exception as e:
    frappe.throw("Invalid or expired Supabase token", frappe.AuthenticationError)

email = user_info.get("email")
if not email:
    frappe.throw("No email in token", frappe.AuthenticationError)

if not frappe.db.exists("User", email):
    frappe.throw("User not found in ERPNext", frappe.AuthenticationError)

# Generate token using frappe.utils (not frappe.generate_hash — blocked by RestrictedPython)
access_token = frappe.utils.generate_hash(length=40)

# OAuth Client "CareVibes POS" must exist — required for Bearer token validation
bearer = frappe.get_doc({
    "doctype": "OAuth Bearer Token",
    "access_token": access_token,
    "client": "26jdbskjl9",
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
