import type { PortfolioData } from '@/types/schema';

export type HostedSaveResult =
  | { ok: true; confirmed: PortfolioData }
  | { ok: false; error: string; needsAuth: boolean };

export type FetchDocResult =
  | { ok: true; doc: PortfolioData }
  | { ok: false; error: string; needsAuth: boolean };

export async function fetchHostedDoc(): Promise<FetchDocResult> {
  let res: Response;
  try {
    res = await fetch('/api/portfolio?full=1', { cache: 'no-store', credentials: 'same-origin' });
  } catch {
    return { ok: false, error: 'Network error — could not reach the server.', needsAuth: false };
  }
  if (res.status === 401) {
    return { ok: false, error: 'Your session expired — sign in again, then retry.', needsAuth: true };
  }
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: `Load failed (${res.status}).`, needsAuth: false };
  }
  if (!res.ok) {
    const msg =
      json && typeof json === 'object' && typeof (json as { error?: unknown }).error === 'string'
        ? (json as { error: string }).error
        : `Load failed (${res.status}).`;
    return { ok: false, error: msg, needsAuth: false };
  }
  const doc = json as PortfolioData;
  if (typeof doc !== 'object' || doc === null || !Array.isArray(doc.tabs)) {
    return { ok: false, error: 'Server returned an invalid document.', needsAuth: false };
  }
  return { ok: true, doc };
}

export async function saveHostedDoc(draftRaw: string): Promise<HostedSaveResult> {
  let res: Response;
  try {
    res = await fetch('/api/portfolio', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: draftRaw,
      credentials: 'same-origin',
    });
  } catch {
    return { ok: false, error: 'Network error — could not reach the server.', needsAuth: false };
  }
  if (res.status === 401) {
    return { ok: false, error: 'Your session expired — sign in again, then retry Save.', needsAuth: true };
  }
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: `Save failed (${res.status}).`, needsAuth: false };
  }
  if (!res.ok) {
    const msg =
      json && typeof json === 'object' && typeof (json as { error?: unknown }).error === 'string'
        ? (json as { error: string }).error
        : `Save failed (${res.status}).`;
    return { ok: false, error: msg, needsAuth: false };
  }
  const confirmed = json as PortfolioData;
  if (typeof confirmed !== 'object' || confirmed === null || !Array.isArray(confirmed.tabs)) {
    return { ok: false, error: 'Server returned an invalid document.', needsAuth: false };
  }
  return { ok: true, confirmed };
}
