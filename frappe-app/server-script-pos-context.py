# ERPNext Server Script - POS Context for CareVibes POS
#
# Create this in ERPNext at: /app/server-script/new
#
# Settings:
#   Script Type: API
#   API Method: pos_context
#   Allow Guest: No (unchecked)
#
# Endpoint:
#   GET /api/method/pos_context
#
# Returns the POS Profile that applies to the logged-in user and the payment
# modes it allows — this is how payment modes are switched on/off per POS
# user: edit the profile's Payment Methods, and its Applicable for Users.
#
# Resolution: a profile that lists the user wins (the one marked Default if
# several); otherwise a profile with no users listed applies to everyone.
#
# ------- Paste everything below this line into the Script field -------

user = frappe.session.user
company = frappe.form_dict.get("company")

profile_filters = {"disabled": 0}
if company:
    profile_filters["company"] = company

candidates = frappe.get_all("POS Profile", filters=profile_filters, pluck="name")

chosen = None
fallback = None
for name in candidates:
    users = frappe.get_all(
        "POS Profile User",
        filters={"parent": name, "parenttype": "POS Profile"},
        fields=["user", "default"],
    )
    if not users and not fallback:
        fallback = name
    for u in users:
        if u.user == user and (not chosen or u.default):
            chosen = name

profile_name = chosen or fallback

result = {"pos_profile": None, "payment_modes": []}
if profile_name:
    rows = frappe.get_all(
        "POS Payment Method",
        filters={"parent": profile_name, "parenttype": "POS Profile"},
        fields=["mode_of_payment", "default"],
        order_by="idx asc",
    )
    modes = []
    for r in rows:
        mop = frappe.db.get_value("Mode of Payment", r.mode_of_payment, ["type", "enabled"], as_dict=True)
        if mop and mop.enabled:
            modes.append({"mode": r.mode_of_payment, "type": mop.type, "default": r.default})
    result = {"pos_profile": profile_name, "payment_modes": modes}

frappe.response["message"] = result
