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
  explore: {
    title: 'Explore movies',
    description: 'Filter the TMDB catalog by genre, year, minimum rating, and sort order.',
    filters: {
      title: 'Filters',
      genre: 'Genre',
      year: 'Year',
      minRating: 'Minimum rating',
      minVotes: 'Minimum votes',
      sortBy: 'Sort by',
      clear: 'Clear filters',
      any: 'Any',
    },
    sortOptions: {
      popularityDesc: 'Most popular',
      popularityAsc: 'Least popular',
      releaseDateDesc: 'Newest releases',
      releaseDateAsc: 'Oldest releases',
      ratingDesc: 'Highest rated',
      ratingAsc: 'Lowest rated',
      titleAsc: 'Title (A–Z)',
      titleDesc: 'Title (Z–A)',
    },
    emptyInitial: 'No movies to show yet. Try adjusting your filters.',
    emptyByFilter: 'No movies match these filters.',
    clearFiltersAction: 'Clear filters',
    loadMore: 'Load more',
    loading: 'Loading movies…',
    loadingAria: 'Loading explore grid',
  },
  movieCard: {
    noPoster: 'No poster',
    noYear: '—',
    noRating: 'No rating',
    unreleased: 'Upcoming',
    accessibleName: (title: string, year: string, ratingLabel: string) =>
      `${title}, ${year}, ${ratingLabel}`,
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
    title: 'Something went wrong',
    description: 'We could not load the movies. Please try again.',
  },
  footer: {
    // Required by TMDB's terms of use. Kept verbatim across languages.
    tmdbAttribution: 'This product uses the API of TMDB but is not endorsed or certified by TMDB.',
    tmdbLinkLabel: 'TMDB attribution',
  },
} as const;
