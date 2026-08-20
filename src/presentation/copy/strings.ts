// presentation/copy/strings.ts — single source for user-visible strings.
// Every literal a user can read lives here, not in a component.

export const copy = {
  brand: 'Cineteca',
  tagline: 'Discover movies. Build your library.',
  nav: {
    primary: 'Main',
    home: 'Home',
    explore: 'Explore',
    search: 'Search',
    myCineteca: 'My Cineteca',
    skipToContent: 'Skip to content',
  },
  home: {
    title: 'Trending this week',
    description: 'Movies and series trending right now, straight from the TMDB catalog.',
  },
  notFound: {
    title: 'Page not found',
    description: 'The page you are looking for does not exist or has been moved.',
    homeCta: 'Back to home',
  },
  errors: {
    boundaryTitle: 'Something went wrong',
    boundaryDescription: 'An unexpected error stopped the page. You can try again.',
    retry: 'Try again',
  },
  footer: {
    // Required by TMDB's terms of use. Kept verbatim across languages.
    tmdbAttribution: 'This product uses the API of TMDB but is not endorsed or certified by TMDB.',
    tmdbLinkLabel: 'TMDB attribution',
  },
} as const;
