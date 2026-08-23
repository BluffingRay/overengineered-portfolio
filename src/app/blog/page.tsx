import { Suspense } from 'react';
import BlogSite from '@/components/blog/BlogSite';

export const metadata = {
  title: 'Blog · Portfolio CMS',
  description: 'Notes, essays, and build logs.',
};

export default function BlogPage() {
  return (
    <Suspense>
      <BlogSite />
    </Suspense>
  );
}
