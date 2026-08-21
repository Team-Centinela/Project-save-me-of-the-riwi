import { describe, expect, it } from 'vitest';
import type { Genre } from './genre';

describe('domain/movie/genre', () => {
  it('carries the id and the name as readonly fields', () => {
    const genre: Genre = { id: 28, name: 'Action' };
    expect(genre.id).toBe(28);
    expect(genre.name).toBe('Action');
  });
});
