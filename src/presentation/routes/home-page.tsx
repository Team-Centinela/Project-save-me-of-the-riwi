// presentation/routes/home-page.tsx — the index route placeholder.
//
// Real content (trending list, hero, etc.) is wired in a follow-up issue.
// The page exists so the index route renders something meaningful while the
// rest of the catalog lands.

import { copy } from '../copy/strings';

export function HomePage() {
  return (
    <section aria-labelledby="home-title" className="flex flex-col gap-4">
      <h1 id="home-title" className="text-3xl font-semibold tracking-tight text-ink">
        {copy.home.title}
      </h1>
      <p className="max-w-prose text-ink-muted">{copy.home.description}</p>
    </section>
  );
}
