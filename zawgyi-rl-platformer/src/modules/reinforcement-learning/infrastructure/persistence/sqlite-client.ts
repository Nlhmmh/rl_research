const API = '/api/policies';

async function request<T>(query = '', init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${query}`, { credentials: 'same-origin', ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Policy storage failed (HTTP ${response.status}).`);
  }
  return response.json() as Promise<T>;
}

function encodeBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary);
}

export function listRecords<T>(): Promise<T[]> {
  return request<T[]>();
}

export async function get<T>(key: string): Promise<T | null> {
  const value = await request<unknown>(`?key=${encodeURIComponent(key)}`);
  return JSON.parse(JSON.stringify(value), (_key, item: unknown) => {
    if (
      item &&
      typeof item === 'object' &&
      '$arrayBuffer' in item &&
      typeof item.$arrayBuffer === 'string'
    ) {
      return Uint8Array.from(atob(item.$arrayBuffer), (byte) => byte.charCodeAt(0)).buffer;
    }
    return item;
  }) as T | null;
}

export async function set(key: string, value: unknown, importOnly = false): Promise<void> {
  await request(`?key=${encodeURIComponent(key)}${importOnly ? '&import=1' : ''}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value, (_key, item: unknown) =>
      item instanceof ArrayBuffer ? { $arrayBuffer: encodeBuffer(item) } : item,
    ),
  });
}

export async function initializeBrowserSession(): Promise<void> {
  await request('/session', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
}
