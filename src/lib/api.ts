const API_BASE = import.meta.env.VITE_API_URL ?? 'https://api.bjconcreland.com';
const API = `${API_BASE.replace(/\/$/, '')}/api`;

export function getToken(): string | null {
  try {
    const json = localStorage.getItem('auth-storage');
    if (!json) return null;
    const data = JSON.parse(json);
    return data?.state?.token ?? null;
  } catch {
    return null;
  }
}

export function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  return fetch(url, { ...options, headers: { ...authHeaders(), ...(options.headers as object) } });
}

export { API };
