import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { buildPortfolioMetadata } from '@/lib/metadata';
import { initialData } from '@/data/initialData';
import BlogSite from '@/components/blog/BlogSite';
import { isHosted } from '@/lib/hosted/isHosted';

// 5d-a — title from the committed doc's chain; absolute so the layout
// template can't suffix it and hosted chrome never wears the seed name.
const docTitle = buildPortfolioMetadata(initialData).title;

export const metadata = {
  title: { absolute: `Blog · ${docTitle}` },
  description: 'Notes, essays, and build logs.',
};

export default function BlogPage() {
  // Hosted shell owns /u/[slug]?post= — keep /blog as pure B (localStorage)
  // so hosted /blog?post= doesn't 200 with a misleading "doesn't exist"
  // when the real shareable URL is /u/[slug]?post=.
  if (isHosted()) notFound();
  return (
    <Suspense>
      <BlogSite />
    </Suspense>
  );
}
