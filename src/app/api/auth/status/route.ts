import { NextResponse } from 'next/server';

/**
 * Tells the client the auth-gate + edit-toggle state. Exposing these
 * booleans is harmless (they're not secrets). `enabled` = an `ADMIN_PASSWORD`
 * is configured (the gate is opt-in). `allowEdit` = editing is permitted at
 * all; unset means editing works (local-first default), but setting
 * `ALLOW_EDIT=false|0|no|off` makes the deployed site read-only — no editor,
 * no shortcut toggle, `?edit=true` shows nothing. Useful for a public
 * self-host (e.g. Vercel) so visitors can't wander into edit mode.
 */
function isTruthyDisabled(value: string | undefined): boolean {
  const v = (value ?? '').trim().toLowerCase();
  return v === 'false' || v === '0' || v === 'no' || v === 'off';
}

export async function GET() {
  const configured =
    typeof process.env.ADMIN_PASSWORD === 'string' &&
    process.env.ADMIN_PASSWORD.trim() !== '';
  const allowEdit = !isTruthyDisabled(process.env.ALLOW_EDIT);
  return NextResponse.json({ enabled: configured, allowEdit });
}
