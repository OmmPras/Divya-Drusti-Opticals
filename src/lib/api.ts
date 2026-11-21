// In-memory token store only for native Capacitor/Android clients (never localStorage)
let nativeInMemoryToken: string | null = null;

export function setNativeToken(token: string | null) {
  nativeInMemoryToken = token;
}

export function isNativeAndroidRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  return Boolean(win.Capacitor?.isNativePlatform?.());
}

export async function apiRequest<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('X-Requested-With', 'DivyaDrustiApp');

  if (isNativeAndroidRuntime()) {
    headers.set('X-Client-Platform', 'android');
    if (nativeInMemoryToken) {
      headers.set('Authorization', `Bearer ${nativeInMemoryToken}`);
    }
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: string }).error)
        : `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data as T;
}

export function formatDiopter(val: string): string {
  const cleaned = val.trim().replace(/[^\d.+-]/g, '');
  if (!cleaned) return '0.00';
  const num = parseFloat(cleaned);
  if (Number.isNaN(num)) return '0.00';
  const rounded = (Math.round(num * 4) / 4).toFixed(2);
  if (Number(rounded) > 0) return `+${rounded}`;
  if (Number(rounded) === 0) return '0.00';
  return rounded;
}

export function formatAxis(val: string): string {
  const digits = val.replace(/\D/g, '');
  if (!digits) return '000';
  const num = Math.max(0, Math.min(180, parseInt(digits, 10)));
  return String(num).padStart(3, '0');
}

export function formatCurrency(amount: number): string {
  return `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function calculateAgePreview(dobStr: string): number | null {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return Math.max(0, Math.min(age, 125));
}
