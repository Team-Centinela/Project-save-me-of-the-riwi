// presentation/components/feature/cast-list.tsx — the cast section.
//
// Renders up to N cast members in a horizontal scrollable list
// (a "rail"). The image configuration is the same one used by
// the rest of the app, and the poster URL helper joins the size
// and the path so the cast headshot URL is built in the domain.

import type { ReactNode } from 'react';
import { type ImageConfiguration, posterUrl } from '@/domain/configuration/image-configuration';
import { type CastMember } from '@/domain/movie/cast';
import { matchNoData } from '@/domain/shared/no-data';
import { copy } from '@/presentation/copy/strings';
import { cn } from '@/presentation/lib/cn';

export interface CastListProps {
  readonly cast: readonly CastMember[];
  readonly imageConfig: ImageConfiguration | undefined;
  readonly size?: 'w185' | 'h632';
}

export function CastList({ cast, imageConfig, size = 'w185' }: CastListProps): ReactNode {
  if (cast.length === 0) {
    return (
      <section data-testid="cast-empty" aria-labelledby="cast-title">
        <h2 id="cast-title" className="text-lg font-semibold text-ink">
          {copy.detail.cast}
        </h2>
        <p className="mt-2 text-sm text-ink-muted">{copy.detail.noCast}</p>
      </section>
    );
  }
  return (
    <section data-testid="cast-list" aria-labelledby="cast-title">
      <h2 id="cast-title" className="text-lg font-semibold text-ink">
        {copy.detail.cast}
      </h2>
      <ul className="mt-4 flex list-none gap-4 overflow-x-auto p-0" data-testid="cast-rail">
        {cast.map((member) => {
          const profile =
            imageConfig !== undefined
              ? posterUrl(
                  imageConfig,
                  member.profilePath.kind === 'present' ? member.profilePath.value : null,
                  size,
                )
              : null;
          const character = matchNoData(member.character, {
            absent: () => null,
            present: (value) => value,
          });
          return (
            <li
              key={member.id}
              className={cn('flex w-32 shrink-0 flex-col gap-2 rounded-card bg-surface-raised p-3')}
              data-testid="cast-member"
            >
              <div className="aspect-poster w-full overflow-hidden rounded-card bg-surface">
                {profile !== null ? (
                  <img
                    src={profile}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    aria-hidden
                    className="flex h-full w-full items-center justify-center text-xs text-ink-muted"
                  >
                    —
                  </div>
                )}
              </div>
              <p className="text-sm font-semibold text-ink" data-testid="cast-name">
                {member.name}
              </p>
              {character !== null && (
                <p className="text-xs text-ink-muted" data-testid="cast-character">
                  {character}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
