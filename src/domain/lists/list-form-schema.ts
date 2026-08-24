/**
 * Form schema for creating or editing a list.
 *
 * The acceptance criteria from issue #16:
 *
 *   - One Zod schema validates and types the form.
 *   - Each rule has its own Spanish message (never "can't do").
 *   - Validation rules: name 1-50 chars, description optional,
 *     max 20 chars.
 *
 * The schema lives next to the form because the form types and
 * the form validators come from the same source: `z.infer` derives
 * the `ListFormValues` type from the schema, and `zodResolver`
 * derives the validator. The schema is also the single place a
 * translator edits when the wording has to change.
 *
 * The validation messages are addressed to the user, not the
 * developer: "El nombre es obligatorio." rather than
 * "Required field". Each rule owns its own message string.
 */

import { z } from 'zod';

export const listFormSchema = z.object({
  name: z
    .string({ message: 'El nombre es obligatorio.' })
    .min(1, { message: 'El nombre es obligatorio.' })
    .max(50, { message: 'El nombre no puede tener más de 50 caracteres.' })
    .trim(),
  description: z
    .string({ message: 'La descripción no puede tener más de 20 caracteres.' })
    .max(20, { message: 'La descripción no puede tener más de 20 caracteres.' })
    .trim(),
});

export type ListFormValues = z.infer<typeof listFormSchema>;

export const LIST_FORM_DEFAULTS: ListFormValues = {
  name: '',
  description: '',
};
