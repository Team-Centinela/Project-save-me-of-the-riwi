import { tmdbHttpClient } from '@/infrastructure/http/client';
import { toMovieDetail } from './_shared';
import { type MovieDetail } from '@/domain/movie/movie-detail';

export interface MovieDetailParams {
  readonly id: number;
  /**
   * When `true`, the request uses
   * `?append_to_response=credits,videos` and the returned
   * `MovieDetail.cast` and `MovieDetail.trailers` are `present`.
   * When `false` (or omitted), they are `absent`. Defaults to
   * `false` to keep tiny detail fetches (e.g. for previews) cheap.
   */
  readonly appendCastAndTrailers?: boolean;
}

/**
 * Fetches a single movie's detail page. Validates the response
 * with the shared detail schema (including any appendage blocks)
 * and returns a domain `MovieDetail`.
 */
export function getMovieDetail(params: MovieDetailParams): Promise<MovieDetail> {
  const append = params.appendCastAndTrailers === true ? 'credits,videos' : undefined;
  const query: Record<string, string> = {
    ...(append !== undefined ? { append_to_response: append } : {}),
  };
  return tmdbHttpClient
    .get<unknown>(
      `/3/movie/${String(params.id)}`,
      Object.keys(query).length > 0 ? { params: query } : undefined,
    )
    .then((data) => toMovieDetail(data));
}
