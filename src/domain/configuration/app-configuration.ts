import { type ImageConfiguration } from '@/domain/configuration/image-configuration';

/**
 * AppConfiguration — the TMDB `/configuration` response, normalized.
 *
 * Today only `images` is used; tomorrow a future feature may need
 * `change_keys` (e.g. the kinds of fields TMDB allows you to append).
 * Keeping the full shape now means a future change is purely
 * additive on the consumer side.
 *
 * @see Cineteca.md — "Base y tamaños de imagen".
 */
export interface AppConfiguration {
  readonly images: ImageConfiguration;
  readonly changeKeys: readonly string[];
}
