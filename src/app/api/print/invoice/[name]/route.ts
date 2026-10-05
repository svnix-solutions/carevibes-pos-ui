import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";

const ERPNEXT_URL = process.env.ERPNEXT_URL || "https://iklera.m.frappe.cloud";

/**
 * Print Format the bill is rendered with. The POS shows ERPNext's own PDF
 * rather than drawing a receipt itself, so what the patient takes home is
 * byte-for-byte the invoice ERPNext would print — totals, GST and layout.
 */
const PRINT_FORMAT =
  process.env.ERPNEXT_INVOICE_PRINT_FORMAT || "Iklera Print Format";

/**
 * Sales Invoice PDF, rendered by ERPNext. Kept separate from the generic
 * ERPNext proxy because that one parses every response as JSON, and pinned to
 * Sales Invoice so it can't be used to print arbitrary documents.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await params;
  const url = new URL(
    "/api/method/frappe.utils.print_format.download_pdf",
    ERPNEXT_URL
  );
  url.searchParams.set("doctype", "Sales Invoice");
  url.searchParams.set("name", name);
  url.searchParams.set("format", PRINT_FORMAT);
  url.searchParams.set("no_letterhead", "0");

  try {
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${session.erpnext_access_token}` },
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("application/pdf")) {
      // ERPNext reports failures (no print permission, missing format) as a
      // JSON or HTML body — pass a short reason on rather than a broken PDF.
      const detail = (await response.text()).slice(0, 300);
      console.error("ERPNext print error:", response.status, detail);
      return NextResponse.json(
        { error: "ERPNext could not render this invoice" },
        { status: response.ok ? 502 : response.status }
      );
    }

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(name)}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("ERPNext print proxy error:", err);
    return NextResponse.json(
      { error: "Failed to reach ERPNext" },
      { status: 502 }
    );
  }
}
