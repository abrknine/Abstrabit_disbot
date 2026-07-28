let token: string | null = localStorage.getItem("token");

export const setToken = (value: string | null) => {
  token = value;
  if (value) localStorage.setItem("token", value);
  else localStorage.removeItem("token");
};

export const getToken = () => token;

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const api = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  return body.data as T;
};
