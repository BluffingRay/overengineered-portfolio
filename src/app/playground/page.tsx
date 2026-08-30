import type { Metadata } from 'next';
import PlaygroundView from '@/playground/PlaygroundView';

export const metadata: Metadata = {
  title: 'Playground — overengineered-portfolio',
  description:
    'The real editor over the demo portfolio. Nothing is saved — play freely.',
};

export default function PlaygroundPage() {
  return <PlaygroundView backHref="/" backLabel="← Back to the site" />;
}
