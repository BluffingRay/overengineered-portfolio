import { Suspense } from 'react';
import { buildPortfolioMetadata } from '@/lib/metadata';
import { initialData } from '@/data/initialData';
import BlogSite from '@/components/blog/BlogSite';

// 5d-a — title from the committed doc's chain; absolute so the layout
// template can't suffix it and hosted chrome never wears the seed name.
const docTitle = buildPortfolioMetadata(initialData).title;

export const metadata = {
  title: { absolute: `Blog · ${docTitle}` },
  description: 'Notes, essays, and build logs.',
};

export default function BlogPage() {
  return (
    <Suspense>
      <BlogSite />
    </Suspense>
  );
}
