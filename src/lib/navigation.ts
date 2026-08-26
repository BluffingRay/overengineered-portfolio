import { useRouter } from 'next/navigation';

// This Next version exports no Router type from 'next/navigation' —
// derive it from the hook so the signature tracks the real API.
type AppRouter = ReturnType<typeof useRouter>;

/**
 * Return to the in-app page the visitor came from instead of a hardcoded
 * destination. Next.js keeps an entry index in history.state — idx > 0
 * means this page was reached by client-side navigation, so history has
 * the real origin (preserving its query params, e.g. ?edit=true). Direct
 * loads have no depth and fall back to the site root, where PortfolioView
 * restores the last-viewed tab from sessionStorage.
 */
export function goBackOrHome(router: AppRouter): void {
  const idx =
    (window.history.state as { idx?: number } | null)?.idx ?? 0;
  if (idx > 0) {
    router.back();
  } else {
    router.push('/');
  }
}
