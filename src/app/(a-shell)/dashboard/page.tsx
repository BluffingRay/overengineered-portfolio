import { redirect } from 'next/navigation';
import { isHosted } from '@/lib/hosted/isHosted';
import DashboardView from '@/components/dashboard/DashboardView';

export const runtime = 'nodejs';

// 5d-a — absolute neutral title (the hosted seed name must not leak into
// its tags). 5g-b — noindex dropped: /dashboard is now the PUBLIC hub
// (welcome card + showcase, 5g-a), so its render is crawlable again.
export const metadata = {
  title: { absolute: 'Dashboard' },
};

// 5e-c — A-only route: without the hosted config (Product B, or LOCAL=true)
// this bounces home instead of 404ing. The neutral admin theme, the auth
// front door and the data fetching live in DashboardView (client).
export default function DashboardPage() {
  if (!isHosted()) redirect('/');

  return <DashboardView />;
}
