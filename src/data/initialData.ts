import type { PortfolioData } from '@/types/schema';

export const initialData: PortfolioData = {
  version: 1,
  skin: 'hud',
  theme: {
    accentColor: '#22d3ee',
  },
  tabs: [
    {
      id: 'tab-home',
      label: 'Home',
      blocks: [
        {
          id: 'block-hero-1',
          type: 'featured_hero',
          heading: 'Raymar — Full-Stack Developer',
          subheading:
            'I build modular web systems that survive their own requirements.',
          ctaLabel: 'View Projects',
          ctaHref: '/projects',
          thumbnail: '/images/hero-portrait.jpg',
          imageAlign: 'right',
        },
      ],
    },
    {
      id: 'tab-projects',
      label: 'Projects',
      blocks: [
        {
          id: 'block-grid-1',
          type: 'app_grid',
          title: 'Selected Work',
          apps: [
            {
              id: 'app-portfolio-cms',
              name: 'Portfolio CMS',
              description:
                'This site: a block-driven portfolio with theme skins and local-first editing.',
              href: '/projects/mama',
              category: 'Web App',
              icon: 'layout-dashboard',
              demoUrl: 'https://example.com/demo',
              githubUrl: 'https://github.com/raymar/portfolio-cms',
            },
            {
              id: 'app-taskflow',
              name: 'TaskFlow',
              description:
                'Kanban board with optimistic sync and offline-first storage.',
              href: '/projects/taskflow',
              category: 'Productivity',
              icon: 'kanban',
              githubUrl: 'https://github.com/raymar/taskflow',
            },
            {
              id: 'app-pixel-forge',
              name: 'Pixel Forge',
              description:
                'Browser-based sprite editor with palette constraints and GIF export.',
              href: '/projects/pixel-forge',
              category: 'Creative Tool',
              icon: 'brush',
            },
          ],
        },
      ],
    },
    {
      id: 'tab-about',
      label: 'About',
      blocks: [
        {
          id: 'block-about-intro',
          type: 'rich_text',
          content:
            'I care about architectures where the schema does the policing: discriminated unions over optional-field soup, exhaustiveness checks over runtime surprises, and data models you can serialize without fear.',
        },
        {
          id: 'block-about-html',
          type: 'custom_html',
          html: '<div class="rounded-lg border border-current/20 p-4"><strong>Currently:</strong> deep in Next.js App Router and design-system tooling.</div>',
        },
      ],
    },
  ],
};
