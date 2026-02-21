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

export function authHeaders(includeContentType = true): HeadersInit {
  const token = getToken();
  return {
    ...(includeContentType ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  // Si el body es FormData, NO forzar Content-Type (el navegador lo pone con el boundary correcto)
  const isFormData = options.body instanceof FormData;
  const baseHeaders = authHeaders(!isFormData);
  return fetch(url, { ...options, headers: { ...baseHeaders, ...(options.headers as object) } });
}

export { API };
