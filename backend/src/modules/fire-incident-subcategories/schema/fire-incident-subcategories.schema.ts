import { z } from 'zod';
import { normalizInput } from '../../../common/utils/normalizeInput.js';

export const fireIncidentSubCategoriesSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Name is required' })
    .transform(normalizInput),
  categoryId: z.uuid({ message: 'Invalid category ID' }),
});

export type FireIncidentSubCategoriesInput = z.infer<
  typeof fireIncidentSubCategoriesSchema
>;
