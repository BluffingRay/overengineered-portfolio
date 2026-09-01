import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PortfolioView from '@/components/PortfolioView';
import { isHosted } from '@/lib/hosted/isHosted';

/**
 * 5e-g — hosted root choice: on a hosted deploy `/` opens the DASHBOARD —
 * the localStorage-driven portfolio render would show every visitor their
 * own seed (meaningless there; the portfolio's public face is /u/<slug>).
 * `?edit=true` is the escape hatch into the editor's existing gate chain.
 * Tradeoff, accepted: awaiting searchParams makes this route dynamic
 * (per-request) in all builds — fine, the page is a client-rendered app
 * surface anyway.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (isHosted()) {
    const params = await searchParams;
    const urlWantsEdit = params.edit === 'true';
    // Persisted edit intent (client sets `portfolio-edit-mode=1` on entering edit;
    // server reads it so a reload at `/` after `?edit=true` doesn't bounce to
    // dashboard before the client can restore `?edit=true` from sessionStorage).
    // Product B never sets this cookie, so no effect there.
    const cookieWantsEdit = (await cookies()).get('portfolio-edit-mode')?.value === '1';
    if (!urlWantsEdit && !cookieWantsEdit) redirect('/dashboard');
  }

  return (
    <Suspense>
      <PortfolioView />
    </Suspense>
  );
}
