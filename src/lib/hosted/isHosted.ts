import { isAdminConfigured } from '@/lib/firebase/admin';
import { hasKv } from '@/lib/kv';

function pickEnv(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

// Hosted shell is active only when all hosted deps present and not forced offline.
// LOCAL=true => dashboard bye bye (your ask); default is offline so B stays frictionless.
export function isHosted(): boolean {
  const localRaw = pickEnv('LOCAL', 'USE_LOCAL', 'STORAGE_LOCAL');
  const forcedOffline = localRaw ? ['true', '1', 'yes', 'local', 'offline'].includes(localRaw.toLowerCase().trim()) : false;
  if (forcedOffline) return false;
  return isAdminConfigured() && hasKv();
}

export function hasHostedConfig(): boolean {
  return isAdminConfigured() && hasKv();
}
