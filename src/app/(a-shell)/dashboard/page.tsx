import { notFound } from 'next/navigation';
import { isHosted } from '@/lib/hosted/isHosted';

export const runtime = 'nodejs';

export default function DashboardPage() {
  if (!isHosted()) notFound();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-sm opacity-60">Hosted portfolios — per-user KV, session-gated. LOCAL=true hides this page.</p>
      <div className="mt-8 rounded-skin border border-[var(--border)] bg-surface p-6">
        <p className="text-sm font-medium">Your portfolios</p>
        <p className="mt-1 text-xs opacity-60">No portfolios yet — create flow coming in 5e onboarding.</p>
      </div>
    </main>
  );
}
