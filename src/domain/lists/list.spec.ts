import { describe, expect, it } from 'vitest';
import { listSchema, listsSchema } from './list';
import { LIST_FORM_DEFAULTS, listFormSchema } from './list-form-schema';
import { buildListFromForm, generateListId } from './list-factory';

const baseList = {
  id: '11111111-1111-4111-8111-111111111111',
  name: '90s noir',
  description: 'A short list.',
  movieIds: [27205, 603],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('domain/lists/list', () => {
  describe('listSchema', () => {
    it('parses a valid list', () => {
      const parsed = listSchema.parse(baseList);
      expect(parsed.name).toBe('90s noir');
      expect(parsed.movieIds.length).toBe(2);
    });

    it('rejects a list with an empty name', () => {
      expect(() => listSchema.parse({ ...baseList, name: '' })).toThrow();
    });

    it('rejects a list with a name longer than 50 characters', () => {
      expect(() => listSchema.parse({ ...baseList, name: 'a'.repeat(51) })).toThrow();
    });

    it('rejects a list with a description longer than 20 characters', () => {
      expect(() => listSchema.parse({ ...baseList, description: 'a'.repeat(21) })).toThrow();
    });

    it('rejects a list with a non-uuid id', () => {
      expect(() => listSchema.parse({ ...baseList, id: 'not-a-uuid' })).toThrow();
    });

    it('rejects a list with a non-positive movie id', () => {
      expect(() => listSchema.parse({ ...baseList, movieIds: [0] })).toThrow();
    });

    it('rejects a list with a non-ISO timestamp', () => {
      expect(() => listSchema.parse({ ...baseList, createdAt: 'not-a-date' })).toThrow();
    });

    it('accepts an empty movieIds array', () => {
      const parsed = listSchema.parse({ ...baseList, movieIds: [] });
      expect(parsed.movieIds).toEqual([]);
    });
  });

  describe('listsSchema', () => {
    it('parses an empty list', () => {
      expect(listsSchema.parse([])).toEqual([]);
    });

    it('parses a list of lists', () => {
      const parsed = listsSchema.parse([baseList]);
      expect(parsed.length).toBe(1);
    });

    it('rejects a list with one corrupt entry', () => {
      expect(() => listsSchema.parse([baseList, { ...baseList, id: 'oops' }])).toThrow();
    });
  });
});

describe('domain/lists/list-form-schema', () => {
  it('rejects an empty name with a Spanish message', () => {
    const result = listFormSchema.safeParse({ name: '', description: '' });
    expect(result.success).toBe(false);
    if (result.success) return;
    const issue = result.error.issues[0];
    expect(issue?.message).toBe('El nombre es obligatorio.');
  });

  it('rejects a name longer than 50 characters with a Spanish message', () => {
    const result = listFormSchema.safeParse({ name: 'a'.repeat(51), description: '' });
    expect(result.success).toBe(false);
    if (result.success) return;
    const issue = result.error.issues[0];
    expect(issue?.message).toBe('El nombre no puede tener más de 50 caracteres.');
  });

  it('rejects a description longer than 20 characters with a Spanish message', () => {
    const result = listFormSchema.safeParse({ name: '90s noir', description: 'a'.repeat(21) });
    expect(result.success).toBe(false);
    if (result.success) return;
    const issue = result.error.issues[0];
    expect(issue?.message).toBe('La descripción no puede tener más de 20 caracteres.');
  });

  it('accepts a name within bounds and an empty description', () => {
    const parsed = listFormSchema.parse({ name: '90s noir', description: '' });
    expect(parsed.name).toBe('90s noir');
    expect(parsed.description).toBe('');
  });

  it('trims the name and description so trailing whitespace does not count', () => {
    const parsed = listFormSchema.parse({ name: '  90s noir  ', description: '  short  ' });
    expect(parsed.name).toBe('90s noir');
    expect(parsed.description).toBe('short');
  });

  it('exposes a defaults object the form can pass to useForm', () => {
    expect(LIST_FORM_DEFAULTS).toEqual({ name: '', description: '' });
  });
});

describe('domain/lists/list-factory', () => {
  it('builds a list from form values with id and timestamps', () => {
    const list = buildListFromForm({ name: '90s noir', description: 'short' }, baseList.id);
    expect(list.id).toBe(baseList.id);
    expect(list.name).toBe('90s noir');
    expect(list.description).toBe('short');
    expect(list.movieIds).toEqual([]);
    expect(list.createdAt).toBe(list.updatedAt);
    expect(list.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('trims whitespace from name and description when building the list', () => {
    const list = buildListFromForm({ name: '  90s noir  ', description: '  short  ' }, baseList.id);
    expect(list.name).toBe('90s noir');
    expect(list.description).toBe('short');
  });

  it('returns a uuid v4 string from generateListId', () => {
    const id = generateListId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
