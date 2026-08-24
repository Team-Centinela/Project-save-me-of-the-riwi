/**
 * Small helper that builds a new `List` from the form values.
 *
 * The form owns the user-typed payload (name + description);
 * this helper owns the fields the form does not know about
 * (id, timestamps, the empty `movieIds` array). The split keeps
 * the form schema free of timestamps so the form's TypeScript
 * type does not carry fields the user cannot edit.
 */

import { type List } from './list';
import { type ListFormValues } from './list-form-schema';

export function buildListFromForm(values: ListFormValues, id: string): List {
  const now = new Date().toISOString();
  return {
    id,
    name: values.name.trim(),
    description: values.description.trim(),
    movieIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function generateListId(): string {
  return crypto.randomUUID();
}
