import type { PortfolioData } from '@/types/schema';

export const initialData: PortfolioData = {
  version: 3,
  skin: 'hud',
  theme: {
    accentColor: '#22d3ee',
  },
  // Global card library — grids reference these by id, so a card can be
  // featured on one tab and detailed on another while staying one entity.
  cards: [
    {
      id: 'app-portfolio-cms',
      name: 'Portfolio CMS',
      description:
        'This site: a block-driven portfolio with theme skins and local-first editing.',
      href: '/projects/mama',
      coverImage: '/images/covers/cms.jpg',
      icon: '/images/icons/react.svg',
      tags: ['next.js', 'local-first', 'dnd-kit'],
      category: 'Web App',
      demoUrl: 'https://example.com/demo',
      githubUrl: 'https://github.com/raymar/portfolio-cms',
      customLabel: 'Build log',
      customPostId: 'post-cms-build-log',
      primaryAction: 'demo',
    },
    {
      id: 'app-taskflow',
      name: 'TaskFlow',
      description:
        'Kanban board with optimistic sync and offline-first storage.',
      href: '/projects/taskflow',
      icon: '/images/icons/trello.svg',
      category: 'Productivity',
      githubUrl: 'https://github.com/raymar/taskflow',
      primaryAction: 'github',
    },
    {
      id: 'app-pixel-forge',
      name: 'Pixel Forge',
      description:
        'Browser-based sprite editor with palette constraints and GIF export.',
      href: '/projects/pixel-forge',
      icon: 'brush',
      tags: ['canvas', 'retro'],
      category: 'Creative Tool',
      customLabel: 'Paper',
      customUrl: 'https://example.com/papers/pixel-forge.pdf',
      primaryAction: 'href',
    },
    {
      id: 'app-synthwave',
      name: 'Synthwave Sequencer',
      description:
        'Web Audio step sequencer with a CRT glow and tape-deck drag.',
      href: '/projects/synthwave',
      icon: 'music',
      tags: ['web-audio', 'fun'],
      category: 'Audio Toy',
      primaryAction: 'href',
    },
    {
      id: 'app-nomad-log',
      name: 'Nomad Log',
      description:
        'No cover image set — watch the monogram watermark fill the slot.',
      href: '/projects/nomad-log',
      category: 'Experiment',
      primaryAction: 'href',
    },
    {
      id: 'app-tiny-db',
      name: 'TinyDB Benchmarks',
      description: 'Embedded storage engines racing headless Chrome.',
      href: '/projects/tinydb',
      icon: 'database',
      category: 'Benchmark',
    },
    {
      id: 'app-terminal-golf',
      name: 'Terminal Golf',
      description: 'Shortest-pipe challenges, scored in keystrokes.',
      href: '/projects/terminal-golf',
      icon: 'terminal',
      category: 'Game',
    },
  ],
  socials: [
    { id: 'social-github', platform: 'github', url: 'https://github.com/raymar' },
    {
      id: 'social-linkedin',
      platform: 'linkedin',
      url: 'https://linkedin.com/in/raymar',
    },
    { id: 'social-twitter', platform: 'twitter', url: 'https://x.com/raymar' },
    { id: 'social-discord', platform: 'discord', url: 'https://discord.com/users/raymar' },
    {
      id: 'social-email',
      platform: 'email',
      url: 'mailto:hey@raymar.dev',
      label: 'Email me',
    },
    {
      id: 'social-custom',
      platform: 'custom',
      url: 'https://read.cv/raymar',
      label: 'CV',
      customIcon: '/images/icons/react.svg',
    },
  ],
  footer: {
    enabled: true,
    copyrightText: '© {year} Raymar — hand-built with the Portfolio CMS.',
    showSocials: true,
  },
  // Blog sample content — the public list renders published posts, newest first.
  posts: [
    {
      id: 'post-cms-build-log',
      title: 'Designing a local-first CMS in one JSON document',
      status: 'published',
      publishedAt: '2026-08-20',
      coverImage: '/images/covers/cms.jpg',
      content:
        '<h2>One document to rule them all</h2><p>This entire site — tabs, blocks, cards, hero dials, socials — serializes into a single JSON document living in your browser’s localStorage. Export it, import it, wipe it: the portfolio <em>is</em> the file.</p><p>React never mirrors that data in component state. <code>useSyncExternalStore</code> hands out immutable snapshots, mutations apply tiny recipes over the latest one, and the undo stack simply remembers whole previous documents instead of patches.</p><ul><li>The schema polices shape — discriminated unions over optional-field soup</li><li>Undo is free when every edit is a document transaction</li><li>Media stores URLs only, so documents stay small and portable</li></ul><blockquote><p>If the schema can’t represent it, the editor shouldn’t either.</p></blockquote><h3>Coming up</h3><p>Images inside rich text wrap left/right via inline float styles, and a clear-float break drops following text back to full width — the next post tells that saga.</p>',
    },
    {
      id: 'post-wrapping-images',
      title:
        'The image-wrap bug that taught me to love <br clear="all">',
      status: 'published',
      publishedAt: '2026-08-12',
      content:
        '<p>Float an image left in the rich-text editor and watch a short paragraph hug it like a barnacle — text snaking up through the leftover column because nothing ever told it to stop. Every floated image ships with this confession attached.</p><p>The fix is gloriously ancient: <code>&lt;br clear="all"&gt;</code>. The toolbar’s ⤵ button inserts a clear-float break node, and suddenly the next paragraph drops politely <em>below</em> the picture instead of threading past it like it pays rent there.</p><p>The best part shipped as plain portable HTML — the same markup that WYSIWYG-edits on Tuesday renders untouched in production on Friday. A moment of silence for a tag that has been solving this exact problem since the nineties.</p>',
    },
    {
      id: 'post-draft-skins',
      title: 'Why your portfolio needs three skins',
      status: 'draft',
      content:
        '<p>Skin switching sounds like vanity until a recruiter opens your neon HUD terminal at 9am. Three skins share one CSS-variable contract here, so the whole personality swap is a single data attribute away.</p><p>Draft notes: per-skin motion tokens, why visitors get the switcher but never the accent color, and what happens when easing curves disagree with the brand. To be continued…</p>',
    },
  ],
  tabs: [
    {
      id: 'tab-home',
      label: 'Home',
      blocks: [
        {
          id: 'block-hero-home',
          type: 'featured_hero',
          eyebrow: '~/raymar — portfolio',
          name: 'Raymar',
          roles: [
            'Full-Stack Developer',
            'Machine Learning Trainer',
            'Backend Developer',
          ],
          heading: 'I build modular web systems that outlive their requirements.',
          subheading: 'Local-first advocate. Serial over-engineer.',
          ctaLabel: 'View Projects',
          ctaHref: '#tab-projects',
          thumbnail: '/images/hero-portrait.jpg',
          layout: 'split',
          statusBadge: {
            enabled: true,
            text: 'Available for work',
            color: 'green',
          },
          secondaryAction: {
            label: 'Hero Lab →',
            url: '#tab-hero-lab',
            target: '_self',
          },
          showSocials: true,
          mediaRatio: 'landscape',
          mediaRadius: 'theme',
          mediaSize: 'lg',
          mediaFrame: 'accent-glow',
        },
        {
          id: 'block-marquee-skills',
          type: 'marquee',
          spacing: 'none',
          items: [
            'TypeScript',
            'Next.js',
            'React',
            'Node.js',
            'Tailwind CSS',
            'PostgreSQL',
            'TipTap',
            'dnd-kit',
            'Web Audio',
            'Docker',
          ],
          separator: '//',
          speed: 'normal',
        },
        {
          id: 'block-grid-featured',
          type: 'app_grid',
          spacing: 'compact',
          title: 'Featured',
          // Same ids as the Projects tab: edit once, updates everywhere.
          apps: ['app-portfolio-cms', 'app-synthwave'],
        },
        {
          id: 'block-blog-home',
          type: 'blog',
          title: 'Latest writing',
        },
        {
          id: 'block-home-intro',
          type: 'rich_text',
          width: 'wide',
          content:
            '<h2>Local-first by design</h2><p>This entire site is <strong>one JSON document</strong> living in your browser — edit it live, drag blocks around, export it, wipe it. Nothing leaves your machine.</p><ul><li><strong>Skins:</strong> flip HUD / Notebook / Clean in the toolbar</li><li><strong>Editing:</strong> press <code>Ctrl/Cmd + Shift + E</code> or visit with <code>?edit=true</code></li><li><strong>History:</strong> <em>Ctrl/Cmd + Z</em> peels back every change</li></ul><blockquote><p>The schema does the policing — discriminated unions over optional-field soup.</p></blockquote>',
        },
        {
          id: 'block-home-html',
          type: 'custom_html',
          spacing: 'compact',
          width: 'full',
          html: '<p style="margin:0 0 10px;font-size:0.7rem;letter-spacing:0.18em;text-transform:uppercase;opacity:0.55;">~/stack</p><div style="display:flex;gap:10px;flex-wrap:wrap;"><span style="border:1px solid currentColor;border-radius:var(--radius);padding:3px 10px;font-size:0.75rem;">Next.js App Router</span><span style="border:1px solid currentColor;border-radius:var(--radius);padding:3px 10px;font-size:0.75rem;">TypeScript strict</span><span style="border:1px solid currentColor;border-radius:var(--radius);padding:3px 10px;font-size:0.75rem;">Tailwind v4</span><span style="border:1px solid currentColor;border-radius:var(--radius);padding:3px 10px;font-size:0.75rem;">TipTap v3</span><span style="border:1px solid currentColor;border-radius:var(--radius);padding:3px 10px;font-size:0.75rem;">dnd-kit</span></div>',
        },
      ],
    },
    {
      id: 'tab-projects',
      label: 'Projects',
      blocks: [
        {
          id: 'block-grid-main',
          type: 'app_grid',
          title: 'Selected Work',
          apps: [
            'app-portfolio-cms',
            'app-taskflow',
            'app-pixel-forge',
            'app-synthwave',
            'app-nomad-log',
          ],
        },
        {
          id: 'block-grid-experiments',
          type: 'app_grid',
          spacing: 'compact',
          title: 'Weekend Experiments',
          apps: ['app-tiny-db', 'app-terminal-golf'],
        },
      ],
    },
    {
      id: 'tab-hero-lab',
      label: 'Hero Lab',
      blocks: [
        {
          id: 'block-hero-lab-intro',
          type: 'rich_text',
          spacing: 'compact',
          content:
            '<p>Same block type, different dials: <strong>layout</strong>, <strong>image side / position</strong>, <strong>media ratio / radius / size / frame</strong>, badge colors. Edit any of it under the Hero form.</p>',
        },
        {
          id: 'block-hero-centered',
          type: 'featured_hero',
          heading: 'Centered · Circle · Window frame',
          subheading:
            'Centered layout stacks copy above media. The window chrome wraps the shot.',
          ctaLabel: 'Ship it',
          ctaHref: '#',
          thumbnail: '/images/covers/cms.jpg',
          layout: 'centered',
          statusBadge: {
            enabled: true,
            text: 'v2 shipped',
            color: 'purple',
          },
          secondaryAction: {
            label: 'Changelog',
            url: '#',
            target: '_blank',
          },
          showSocials: true,
          mediaRatio: 'circle',
          mediaSize: 'sm',
          mediaFrame: 'window',
        },
        {
          id: 'block-hero-banner',
          type: 'featured_hero',
          spacing: 'compact',
          heading: 'Banner · full-bleed backdrop',
          subheading:
            'The image sits behind frosted glass; legacy imageAlign mapped here too.',
          ctaLabel: 'Enter',
          ctaHref: '#',
          thumbnail: '/images/hero-portrait.jpg',
          layout: 'banner',
          statusBadge: {
            enabled: true,
            text: 'Under construction',
            color: 'amber',
          },
          mediaRatio: 'landscape',
          mediaFrame: 'none',
        },
        {
          id: 'block-hero-split-portrait',
          type: 'featured_hero',
          heading: 'Split · Portrait · Squircle',
          subheading:
            'Small size pinned to the far edge; quiet glow frame.',
          ctaLabel: 'Primary CTA',
          ctaHref: '#',
          thumbnail: '/images/covers/cms.jpg',
          layout: 'split',
          mediaSide: 'left',
          statusBadge: {
            enabled: true,
            text: 'Blue state',
            color: 'blue',
          },
          secondaryAction: {
            label: 'Docs',
            url: '#',
            target: '_blank',
          },
          mediaRatio: 'portrait',
          mediaRadius: 'squircle',
          mediaSize: 'sm',
          mediaFrame: 'subtle',
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
            '<p>I care about architectures where the schema does the policing: discriminated unions over optional-field soup, exhaustiveness checks over runtime surprises, and data models you can serialize without fear.</p><h3>Currently</h3><ul><li>Deep in Next.js App Router internals</li><li>Design-system tooling &amp; token pipelines</li><li>Teaching every pattern back until it sticks</li></ul>',
        },
        {
          id: 'block-about-html',
          type: 'custom_html',
          spacing: 'none',
          html: '<div class="rounded-lg border border-current/20 p-4"><strong>Status:</strong> this block is raw HTML — scripts stay out, styles stay in.</div>',
        },
        {
          id: 'block-blog-all',
          type: 'blog',
          spacing: 'compact',
          title: 'Everything I have written',
          // Stacked-list variant — the Home tab demos the latest-3 grid.
          variant: 'all',
        },
      ],
    },
  ],
};
