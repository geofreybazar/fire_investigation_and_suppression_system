import { z } from 'zod';
import {
  CATEGORY_TYPE,
  FireIncidentStatus,
} from '../../../generated/prisma/enums.js';

// Filters shared by the summary, the report and the map. Dates bound the
// incident date: the fire's date, or the recording date when it is blank.
export const statisticsQuerySchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    status: z.enum(FireIncidentStatus).optional(),
    categoryType: z.enum(CATEGORY_TYPE).optional(),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: "'from' must not be after 'to'",
  });
export type StatisticsQuery = z.infer<typeof statisticsQuerySchema>;

export const reportQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    status: z.enum(FireIncidentStatus).optional(),
    categoryType: z.enum(CATEGORY_TYPE).optional(),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: "'from' must not be after 'to'",
  });
export type ReportQuery = z.infer<typeof reportQuerySchema>;
