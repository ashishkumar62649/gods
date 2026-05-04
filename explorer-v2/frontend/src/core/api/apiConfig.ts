const configuredApiBase =
  import.meta.env.VITE_API_BASE?.trim() ||
  import.meta.env.VITE_FLIGHT_API_BASE?.trim();

export const API_BASE = configuredApiBase || (import.meta.env.DEV ? 'http://localhost:8788' : '');

export function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}
