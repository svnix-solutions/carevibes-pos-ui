def run(
    sinv,
    lab_item_group = "Laboratory",
    debug          = True
):

    def dmsg(msg):
        if debug:
            frappe.msgprint(msg, title="Lab PO Debug", indicator="blue")

    dmsg(f"Script started | SINV: {sinv.name} | docstatus: {sinv.docstatus}")

    # ── Step 1: Find linked Sales Order ──────────────────────
    sales_order_name = None
    for item in sinv.items:
        if item.get("sales_order"):
            sales_order_name = item.sales_order
            break

    if not sales_order_name:
        dmsg("STOPPED: No Sales Order linked on any invoice item.")
        return

    dmsg(f"Sales Order: {sales_order_name}")
    so = frappe.get_doc("Sales Order", sales_order_name)

    # ── Step 2: Group lab items by custom_supplier on Item master ──
    supplier_items = {}  # { supplier_name: [so_item, ...] }

    for item in so.items:
        ig = item.get("item_group") or ""
        if ig != lab_item_group:
            dmsg(f"  -> Skipping: {item.item_code} (item_group: '{ig}')")
            continue

        item_supplier = frappe.db.get_value("Item", item.item_code, "custom_supplier") or ""
        dmsg(f"  -> Lab item: {item.item_code} | custom_supplier: '{item_supplier}'")

        if not item_supplier:
            dmsg(f"  -> Skipping: {item.item_code} (no custom_supplier on Item master)")
            continue

        if not frappe.db.exists("Supplier", item_supplier):
            frappe.msgprint(
                f"Supplier <b>{item_supplier}</b> for item {item.item_code} not found. Skipping.",
                title="Lab PO Error", indicator="red"
            )
            dmsg(f"  -> Skipping: {item.item_code} (Supplier '{item_supplier}' does not exist)")
            continue

        if item_supplier not in supplier_items:
            supplier_items[item_supplier] = []
        supplier_items[item_supplier].append(item)

    if not supplier_items:
        dmsg(f"STOPPED: No lab items with a valid custom_supplier found in SO {sales_order_name}.")
        return

    dmsg(f"Suppliers to PO: {list(supplier_items.keys())}")

    # ── Step 3: Get buying price list ────────────────────────
    buying_price_list = (
        frappe.db.get_single_value("Buying Settings", "buying_price_list")
        or "Standard Buying"
    )
    dmsg(f"Buying price list: '{buying_price_list}'")

    # ── Step 4: Create one PO per supplier ────────────────────
    created_pos = []
    today = frappe.utils.nowdate()

    for supplier_name, lab_items in supplier_items.items():

        # Duplicate guard — per supplier x SO combination
        existing_pos = frappe.get_all("Purchase Order Item",
            filters={"sales_order": sales_order_name, "docstatus": ["!=", 2]},
            fields=["parent"]
        )
        duplicate_found = False
        for ei in existing_pos:
            po_supplier = frappe.db.get_value("Purchase Order", ei.get("parent"), "supplier")
            if po_supplier == supplier_name:
                frappe.msgprint(
                    f"Lab PO <b>{ei.get('parent')}</b> already exists for {supplier_name} / {sales_order_name}. Skipping.",
                    title="Lab PO", indicator="blue"
                )
                dmsg(f"SKIPPED: Duplicate PO found: {ei.get('parent')}")
                duplicate_found = True
                break

        if duplicate_found:
            continue

        po = frappe.new_doc("Purchase Order")
        po.supplier          = supplier_name
        po.company           = sinv.company
        po.transaction_date  = today
        po.schedule_date     = today
        po.currency          = sinv.currency
        po.conversion_rate   = frappe.utils.flt(sinv.conversion_rate) or 1.0
        po.buying_price_list = buying_price_list

        for lab_item in lab_items:
            po.append("items", {
                "item_code":     lab_item.item_code,
                "item_name":     lab_item.item_name,
                "description":   lab_item.description or lab_item.item_name,
                "qty":           lab_item.qty,
                "uom":           lab_item.uom,
                "rate":          0,
                "schedule_date": today,
                "sales_order":   sales_order_name,
            })

        dmsg(f"Inserting PO for '{supplier_name}' with {len(lab_items)} item(s)...")
        po.insert(ignore_permissions=True)
        created_pos.append((po.name, supplier_name, len(lab_items)))
        dmsg(f"Created PO: {po.name} | {supplier_name}")

    if created_pos:
        rows = "".join(
            f"<li>{n} &rarr; {s} ({c} item(s))</li>"
            for n, s, c in created_pos
        )
        frappe.msgprint(
            f"<b>{len(created_pos)} Lab Purchase Order(s) created:</b><ul>{rows}</ul>",
            title="Lab PO Created",
            indicator="green"
        )


run(doc)
