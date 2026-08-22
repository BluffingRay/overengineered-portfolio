import type { AppGridBlock as AppGridBlockData } from '@/types/schema';

interface Props {
  block: AppGridBlockData;
}

export default function AppGridBlock({ block }: Props) {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">{block.title}</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {block.apps.map((app) => {
          const primaryHref =
            { demo: app.demoUrl, github: app.githubUrl, href: app.href }[
              app.primaryAction ?? 'href'
            ] ?? app.href;

          return (
            <article
              key={app.id}
              className="relative flex flex-col rounded-2xl border border-current/15 p-5 transition-colors hover:border-current/40"
            >
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-current/10 text-sm font-semibold">
                {app.name.charAt(0)}
              </span>
              {app.category && (
                <span className="rounded-full border border-current/20 px-2.5 py-0.5 text-xs opacity-60">
                  {app.category}
                </span>
              )}
            </div>
            <h3 className="mt-4 font-medium">
              <a
                href={primaryHref}
                target="_blank"
                rel="noreferrer"
                className="text-accent after:absolute after:inset-0 after:rounded-2xl"
              >
                {app.name}
              </a>
            </h3>
            <p className="mt-1 text-sm opacity-60">{app.description}</p>
            {(app.demoUrl || app.githubUrl) && (
              <div className="relative z-10 mt-auto flex gap-4 pt-4 text-sm">
                {app.demoUrl && (
                  <a
                    href={app.demoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-4 transition-colors hover:text-accent hover:underline"
                  >
                    Demo ↗
                  </a>
                )}
                {app.githubUrl && (
                  <a
                    href={app.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-4 transition-colors hover:text-accent hover:underline"
                  >
                    GitHub ↗
                  </a>
                )}
              </div>
            )}
          </article>
        );
        })}
      </div>
    </section>
  );
}
