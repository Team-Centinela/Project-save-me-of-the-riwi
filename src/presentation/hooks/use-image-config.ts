// presentation/hooks/use-image-config.ts — TMDB image configuration hook.
//
// The `/configuration` endpoint is the source of every poster and
// backdrop URL in the app. The infrastructure layer caches the
// response forever (issue #12); this hook just exposes the cached
// value through TanStack Query so consumers do not have to think
// about HTTP.

import { useQuery } from '@tanstack/react-query';
import { getAppConfiguration } from '@/infrastructure/api';
import { type AppConfiguration } from '@/domain/configuration/app-configuration';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function useImageConfig() {
  return useQuery<AppConfiguration>({
    queryKey: ['tmdb', 'configuration'],
    queryFn: getAppConfiguration,
    staleTime: ONE_DAY_MS,
    gcTime: ONE_DAY_MS,
  });
}
