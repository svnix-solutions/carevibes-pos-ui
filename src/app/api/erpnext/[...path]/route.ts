import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";

const ERPNEXT_URL = process.env.ERPNEXT_URL || "https://carevibes.m.frappe.cloud";

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
  method: string
) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path } = await params;
  const erpnextPath = path.join("/");
  const url = new URL(`/${erpnextPath}`, ERPNEXT_URL);

  // Forward query parameters
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.erpnext_access_token}`,
    Accept: "application/json",
  };

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  // Forward body for POST/PUT/PATCH
  if (["POST", "PUT", "PATCH"].includes(method)) {
    try {
      const body = await request.json();
      headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(body);
    } catch {
      // No body or invalid JSON
    }
  }

  try {
    const response = await fetch(url.toString(), fetchOptions);
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    console.error("ERPNext proxy error:", err);
    return NextResponse.json(
      { error: "Failed to reach ERPNext" },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context, "GET");
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context, "POST");
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context, "PUT");
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context, "DELETE");
}
