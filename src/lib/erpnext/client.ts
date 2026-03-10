class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Extract a human-readable message from an ERPNext error response body. */
function parseErpNextError(body: string): string {
  try {
    const json = JSON.parse(body);
    // _server_messages is a JSON-encoded array of JSON-encoded message objects
    if (json._server_messages) {
      const msgs: string[] = JSON.parse(json._server_messages);
      const first = JSON.parse(msgs[0]);
      if (first?.message) {
        // Strip HTML tags for a clean toast message
        return first.message.replace(/<[^>]*>/g, "");
      }
    }
    if (json.message) return json.message;
    if (json.exception) {
      // "frappe.exceptions.ValidationError: Actual message"
      const parts = json.exception.split(": ");
      return parts.length > 1 ? parts.slice(1).join(": ").replace(/<[^>]*>/g, "") : parts[0];
    }
  } catch {
    // not JSON — return as-is
  }
  return body.slice(0, 200);
}

class ERPNextClient {
  private baseUrl = "/api/erpnext";

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}/${path}`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) url.searchParams.set(k, v);
      });
    }

    const res = await fetch(url.toString());

    if (res.status === 401) {
      window.location.href = "/login";
      throw new ApiError(401, "Session expired");
    }

    if (!res.ok) {
      const text = await res.text();
      throw new ApiError(res.status, parseErpNextError(text));
    }

    const json = await res.json();
    return json.data ?? json;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}/${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      window.location.href = "/login";
      throw new ApiError(401, "Session expired");
    }

    if (!res.ok) {
      const text = await res.text();
      throw new ApiError(res.status, parseErpNextError(text));
    }

    const json = await res.json();
    return json.data ?? json;
  }

  // Convenience methods for ERPNext resources
  async getList<T>(
    doctype: string,
    options?: {
      fields?: string[];
      filters?: unknown[];
      orFilters?: unknown[];
      orderBy?: string;
      limit?: number;
      start?: number;
    }
  ): Promise<T[]> {
    const params: Record<string, string> = {};

    if (options?.fields) {
      params.fields = JSON.stringify(options.fields);
    }
    if (options?.filters && options.filters.length > 0) {
      params.filters = JSON.stringify(options.filters);
    }
    if (options?.orFilters && options.orFilters.length > 0) {
      params.or_filters = JSON.stringify(options.orFilters);
    }
    if (options?.orderBy) {
      params.order_by = options.orderBy;
    }
    if (options?.limit !== undefined) {
      params.limit_page_length = String(options.limit);
    }
    if (options?.start !== undefined) {
      params.limit_start = String(options.start);
    }

    return this.get<T[]>(`api/resource/${doctype}`, params);
  }

  async getDoc<T>(doctype: string, name: string): Promise<T> {
    return this.get<T>(`api/resource/${doctype}/${encodeURIComponent(name)}`);
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}/${path}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      window.location.href = "/login";
      throw new ApiError(401, "Session expired");
    }

    if (!res.ok) {
      const text = await res.text();
      throw new ApiError(res.status, parseErpNextError(text));
    }

    const json = await res.json();
    return json.data ?? json;
  }

  async createDoc<T>(doctype: string, doc: Record<string, unknown>): Promise<T> {
    return this.post<T>(`api/resource/${doctype}`, doc);
  }

  async updateDoc<T>(
    doctype: string,
    name: string,
    fields: Record<string, unknown>
  ): Promise<T> {
    return this.put<T>(
      `api/resource/${doctype}/${encodeURIComponent(name)}`,
      fields
    );
  }

  async callMethod<T>(method: string, args?: Record<string, unknown>): Promise<T> {
    return this.post<T>(`api/method/${method}`, args || {});
  }

  /**
   * Submit a document with retry on TimestampMismatchError.
   * Frappe hooks can modify a doc between create and submit, causing stale
   * timestamps. This re-fetches the doc on each retry to get the latest version.
   */
  async submitDoc(doctype: string, name: string, maxRetries = 3): Promise<void> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const freshDoc = await this.getDoc<Record<string, unknown>>(doctype, name);
        await this.callMethod("frappe.client.submit", {
          doc: JSON.stringify(freshDoc),
        });
        return;
      } catch (err) {
        const isTimestampError =
          err instanceof ApiError &&
          err.message.includes("TimestampMismatchError");
        if (isTimestampError && attempt < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }
  }
}

export const erpnext = new ERPNextClient();
