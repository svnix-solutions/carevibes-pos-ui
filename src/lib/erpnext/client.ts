class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
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
      throw new ApiError(res.status, text);
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
      throw new ApiError(res.status, text);
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

  async createDoc<T>(doctype: string, doc: Record<string, unknown>): Promise<T> {
    return this.post<T>(`api/resource/${doctype}`, doc);
  }

  async callMethod<T>(method: string, args?: Record<string, unknown>): Promise<T> {
    return this.post<T>(`api/method/${method}`, args || {});
  }
}

export const erpnext = new ERPNextClient();
