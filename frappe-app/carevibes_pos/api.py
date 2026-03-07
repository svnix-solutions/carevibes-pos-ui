import frappe
import requests
from frappe.utils import now_datetime, add_to_date


@frappe.whitelist(allow_guest=True)
def exchange_token(supabase_token=None):
    """Exchange a Supabase access_token for an ERPNext OAuth Bearer Token.

    Validates the Supabase token against the carevibes-auth-ui bridge's
    userinfo endpoint, finds the matching ERPNext user by email, and
    creates a time-limited OAuth Bearer Token for API access.
    """
    if not supabase_token:
        frappe.throw("Missing supabase_token", frappe.AuthenticationError)

    bridge_userinfo_url = frappe.conf.get(
        "bridge_userinfo_url",
        "https://carevibes-auth.netlify.app/api/bridge/userinfo",
    )

    try:
        resp = requests.get(
            bridge_userinfo_url,
            headers={"Authorization": f"Bearer {supabase_token}"},
            timeout=10,
        )
    except requests.RequestException:
        frappe.throw("Failed to validate token with auth bridge", frappe.AuthenticationError)

    if resp.status_code != 200:
        frappe.throw("Invalid or expired Supabase token", frappe.AuthenticationError)

    user_info = resp.json()
    email = user_info.get("email")

    if not email:
        frappe.throw("No email found in token", frappe.AuthenticationError)

    if not frappe.db.exists("User", email):
        frappe.throw(f"User {email} not found in ERPNext", frappe.AuthenticationError)

    # Create an ERPNext OAuth Bearer Token (8-hour expiry for a POS shift)
    access_token = frappe.generate_hash(length=40)
    bearer = frappe.get_doc(
        {
            "doctype": "OAuth Bearer Token",
            "access_token": access_token,
            "user": email,
            "scopes": "all openid",
            "expiration_time": add_to_date(now_datetime(), hours=8),
            "status": "Active",
        }
    )
    bearer.insert(ignore_permissions=True)
    frappe.db.commit()

    return {
        "access_token": access_token,
        "expires_in": 28800,
        "token_type": "Bearer",
        "email": email,
        "full_name": frappe.db.get_value("User", email, "full_name"),
    }
