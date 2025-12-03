const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://besideai.work";

export type ApiMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface ApiRequestOptions extends RequestInit {
  method?: ApiMethod;
  authToken?: string | null;
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { method = "GET", authToken, headers, ...rest } = options;

  const url =
    endpoint.startsWith("http") || endpoint.startsWith("/")
      ? endpoint
      : `/api${endpoint}`;

  const finalUrl = url.startsWith("http")
    ? url
    : `${API_BASE_URL.replace(/\/$/, "")}${url}`;

  const res = await fetch(finalUrl, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(headers || {}),
    },
    ...rest,
  });

  if (!res.ok) {
    if (res.status === 401) {
      // Let caller decide what to do; frontend can redirect to /login.
      throw new Error("Unauthorized");
    }
    const text = await res.text();
    throw new Error(text || `API Error: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as T;
}


