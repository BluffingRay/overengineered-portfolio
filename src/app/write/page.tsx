import { Suspense } from 'react';
import WriteView from '@/components/write/WriteView';

// 5d-a — admin chrome: absolute neutral title (neither the B doc name nor
// the hosted seed name may leak here) + noindex (never a search target).
export const metadata = {
  title: { absolute: 'Write' },
  robots: { index: false, follow: false },
};

export default function WritePage() {
  return (
    <Suspense>
      <WriteView />
    </Suspense>
  );
}
