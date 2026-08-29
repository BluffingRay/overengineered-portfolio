import { redirect } from 'next/navigation';
import { isHosted } from '@/lib/hosted/isHosted';
import DashboardView from '@/components/dashboard/DashboardView';

export const runtime = 'nodejs';

// 5e-c — A-only route: without the hosted config (Product B, or LOCAL=true)
// this bounces home instead of 404ing. The neutral admin theme, the auth
// front door and the data fetching live in DashboardView (client).
export default function DashboardPage() {
  if (!isHosted()) redirect('/');

  return <DashboardView />;
}
