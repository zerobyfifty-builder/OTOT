const TOKEN_KEY = "otot.jwt";
const LEGACY_SESSION_KEY = "otot.mock-session";

export class ApiError extends Error {
  status: number;
  /** Server error code, e.g. "payment_pending" or "password_change_required". */
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function apiBase(): string {
  return (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Cannot reach the OTOT API. Confirm it is running.");
  }

  const data: unknown =
    res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) {
    const body = data && typeof data === "object" ? (data as { error?: unknown; code?: unknown }) : {};
    const message = typeof body.error === "string" ? body.error : "Request failed";
    throw new ApiError(res.status, message, typeof body.code === "string" ? body.code : undefined);
  }
  return data as T;
}

export function apiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Request failed";
}
