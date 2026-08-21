/**
 * Genre — a TMDB movie genre.
 *
 * The id is what matters at the filter layer; the name is what the
 * UI shows. The shape is shared between `/genre/movie/list` and the
 * per-movie `genres` array on the detail response.
 *
 * @see Cineteca.md — "El contrato con la API que consumen".
 */
export interface Genre {
  readonly id: number;
  readonly name: string;
}
