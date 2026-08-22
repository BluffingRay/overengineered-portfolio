import type { FeaturedHeroBlock as FeaturedHeroBlockData } from '@/types/schema';

interface Props {
  block: FeaturedHeroBlockData;
}

export default function FeaturedHeroBlock({ block }: Props) {
  const align = block.imageAlign ?? 'right';

  return (
    <section
      className={`flex isolate gap-10 ${
        {
          left: 'flex-col items-start md:flex-row md:items-center',
          right: 'flex-col items-start md:flex-row-reverse md:items-center',
          top: 'flex-col items-start',
          backdrop: 'relative min-h-[420px] flex-col justify-end overflow-hidden rounded-2xl',
        }[align]
      }`}
    >
      {block.thumbnail ? (
        <img
          src={block.thumbnail}
          alt=""
          className={`${
            {
              left: 'w-full rounded-2xl object-cover md:w-1/2',
              right: 'w-full rounded-2xl object-cover md:w-1/2',
              top: 'aspect-video w-full rounded-2xl object-cover',
              backdrop: 'absolute inset-0 -z-10 h-full w-full object-cover',
            }[align]
          }`}
        />
      ) : null}
      <div
        className={`${
          align === 'backdrop'
            ? 'w-full rounded-2xl bg-black/50 p-10 text-white backdrop-blur-sm'
            : 'flex-1 space-y-4'
        }`}
      >
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          {block.heading}
        </h1>
        <p className="max-w-xl text-lg opacity-70">{block.subheading}</p>
        <a
          href={block.ctaHref}
          className="inline-block rounded-full border border-accent/60 px-5 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent hover:text-background"
        >
          {block.ctaLabel} →
        </a>
      </div>
    </section>
  );
}
