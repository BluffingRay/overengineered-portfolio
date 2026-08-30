import type { MetadataRoute } from 'next';

// 5g-b — crawler permissions: everything is crawlable except the app
// chrome — /write (composer), /onboarding (first-run flow), /api (route
// handlers). /dashboard is deliberately NOT disallowed (5g-a made it the
// public hub — its render is welcome card + showcase) and /u/ is not
// either — public portfolios are the product.

export default function robots(): MetadataRoute.Robots {
  // Same base fallback as the root layout's metadataBase (see sitemap.ts).
  const base = new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  );

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/write', '/onboarding', '/api'],
    },
    sitemap: new URL('/sitemap.xml', base).toString(),
  };
}
