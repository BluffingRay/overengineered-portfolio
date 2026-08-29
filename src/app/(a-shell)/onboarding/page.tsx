import { redirect } from 'next/navigation';
import { isHosted } from '@/lib/hosted/isHosted';
import OnboardingView from '@/components/onboarding/OnboardingView';

export const runtime = 'nodejs';

// 5e-d — A-only route (same gate as /dashboard): without the hosted config
// (Product B, or LOCAL=true) this bounces home instead of 404ing. The
// neutral admin theme, the auth front door and the stepper live in
// OnboardingView (client).
export default function OnboardingPage() {
  if (!isHosted()) redirect('/');

  return <OnboardingView />;
}
