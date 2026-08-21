import { type NoData } from '@/domain/shared/no-data';

/**
 * CastMember — a credited actor on a movie.
 *
 * The `character` field carries the role played and is often empty for
 * cameos or uncredited work; the `profilePath` carries the headshot.
 * Both wrap `NoData` so the type itself says whether the data is
 * present or absent — TMDB sends `null` for "no data" and the
 * validation edge translates that.
 *
 * @see docs/architecture.md — "Absences are explicit in the type".
 */
export interface CastMember {
  readonly id: number;
  readonly name: string;
  readonly character: NoData<string>;
  readonly profilePath: NoData<string>;
}
