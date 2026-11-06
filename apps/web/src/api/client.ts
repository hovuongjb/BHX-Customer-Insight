const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (method !== "GET") {
    const csrfToken = readCookie("csrfToken");
    if (csrfToken) headers.set("x-csrf-token", csrfToken);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, method, headers, credentials: "include" });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : null;

  if (!res.ok) {
    const err = body?.error ?? { code: "UNKNOWN", message: "Đã có lỗi xảy ra." };
    throw new ApiError(res.status, err.code, err.message);
  }
  return body as T;
}

export function apiFileUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
