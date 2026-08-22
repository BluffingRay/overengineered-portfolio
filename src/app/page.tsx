import { Suspense } from 'react';
import PortfolioView from '@/components/PortfolioView';

export default function Home() {
  return (
    <Suspense>
      <PortfolioView />
    </Suspense>
  );
}
