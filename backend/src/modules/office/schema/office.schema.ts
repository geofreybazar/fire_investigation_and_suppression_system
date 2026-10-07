import { z } from 'zod';

export const officeSchema = z.object({
  name: z.string().min(5, 'Office name is required'),
  type: z.enum([
    'NATIONAL_HEADQUARTERS',
    'REGIONAL_OFFICE',
    'DISTRICT_FIRE_STATION',
    'PROVINCIAL_FIRE_STATION',
    'CITY_FIRE_STATION',
    'MUNICIPAL_FIRE_STATION',
  ]),
  parentId: z.uuid().optional(),
});

export type OfficeInput = z.infer<typeof officeSchema>;
