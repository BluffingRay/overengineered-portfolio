import { Suspense } from 'react';
import WriteView from '@/components/write/WriteView';

export const metadata = { title: 'Write · Portfolio CMS' };

export default function WritePage() {
  return (
    <Suspense>
      <WriteView />
    </Suspense>
  );
}
