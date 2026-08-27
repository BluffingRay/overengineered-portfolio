import { NextResponse } from 'next/server';

/**
 * Tells the client whether the auth gate is even enabled. Exposing this
 * boolean is harmless (it's not the secret). When no `ADMIN_PASSWORD` is
 * configured, the gate is OFF and edit mode works as before — the gate is
 * opt-in by adding the env var. The client checks this on mount so it never
 * blocks an install that didn't ask for auth.
 */
export async function GET() {
  const configured =
    typeof process.env.ADMIN_PASSWORD === 'string' &&
    process.env.ADMIN_PASSWORD.trim() !== '';
  return NextResponse.json({ enabled: configured });
}
