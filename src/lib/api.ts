// Permite configurar la URL del backend vía variable de entorno en build.
// Si no se define VITE_API_URL, seguirá usando la ruta relativa /api.
const API = import.meta.env.VITE_API_URL ?? '/api';

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
