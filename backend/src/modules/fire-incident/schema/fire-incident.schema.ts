import { z } from 'zod';
import {
  FireIncidentStatus,
  FireAlarmLevel,
} from '../../../generated/prisma/enums.js';

export const fireIncidentSchema = z.object({
  // Incident information
  incidentNo: z
    .string()
    .trim()
    .min(5, 'Incident number must be at least 5 characters'),

  dateTimeReported: z.coerce.date().optional().nullable(),
  dateTimeFireIncident: z.coerce.date().optional().nullable(),
  dateTimeCallReceived: z.coerce.date().optional().nullable(),
  dateTimeUnresponded: z.coerce.date().optional().nullable(),

  fireIncidentStatus: z.enum(FireIncidentStatus),
  currentAlarmLevel: z.enum(FireAlarmLevel).optional().nullable(),
  // Classification
  categoryId: z.uuid('Invalid incident category ID'),
  subcategoryId: z
    .uuid('Invalid incident subcategory ID')
    .optional()
    .nullable(),
  // Establishment
  establishmentId: z.uuid('Invalid establishment ID').optional().nullable(),
  // Additional information
  remarks: z
    .string()
    .trim()
    .max(2000, 'Remarks cannot exceed 2000 characters')
    .optional()
    .nullable(),
});

export type FireIncidentInput = z.infer<typeof fireIncidentSchema>;
