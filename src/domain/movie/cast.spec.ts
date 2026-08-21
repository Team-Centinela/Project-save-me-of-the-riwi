import { absent, present } from '@/domain/shared/no-data';
import { describe, expect, it } from 'vitest';
import type { CastMember } from './cast';

describe('domain/movie/cast', () => {
  it('carries absent or present wraps for character and profile', () => {
    const withEverything: CastMember = {
      id: 1,
      name: 'Keanu Reeves',
      character: present('Neo'),
      profilePath: present('/path.jpg'),
    };
    const withNothing: CastMember = {
      id: 2,
      name: 'Unknown',
      character: absent<string>(),
      profilePath: absent<string>(),
    };

    expect(withEverything.character).toEqual({ kind: 'present', value: 'Neo' });
    expect(withNothing.character).toEqual({ kind: 'absent' });
    expect(withNothing.profilePath.kind).toBe('absent');
  });
});
