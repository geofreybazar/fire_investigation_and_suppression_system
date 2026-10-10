import { z } from 'zod';
import {
  FireAlarmLevel,
  FireIncidentStatus,
  IncidentApprovalStatus,
} from '../../../generated/prisma/enums.js';

// Request schemas for fire incidents. The client never supplies the incident
// number, the owning office or the office-derived location fields.

const notInFuture = (date: Date) => date.getTime() <= Date.now();

const eventTime = z.coerce
  .date()
  .refine(notInFuture, 'The event time cannot be in the future');

const optionalDate = z.coerce.date().optional().nullable();

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().nullable();

const count = z.number().int().min(0);
const amount = z.number().min(0).optional().nullable();

const latitude = z.number().min(-90).max(90).nullable();
const longitude = z.number().min(-180).max(180).nullable();

const bothOrNeither = (location: { latitude?: unknown; longitude?: unknown }) =>
  (location.latitude === undefined) === (location.longitude === undefined) &&
  (location.latitude === null) === (location.longitude === null);

const coordinatesMessage = {
  message: 'Latitude and longitude must be given together',
};

export const timelineEntrySchema = z.object({
  status: z.enum(FireIncidentStatus),
  // Omitted: keep the alarm in effect at that time. null: no alarm raised.
  alarmLevel: z.enum(FireAlarmLevel).nullable().optional(),
  occurredAt: eventTime,
  remarks: optionalText(1000),
});
export type TimelineEntryInput = z.infer<typeof timelineEntrySchema>;

const impactSchema = z.object({
  fatalitiesCiv: count.optional(),
  injuredCiv: count.optional(),
  fatalitiesBFP: count.optional(),
  injuredBFP: count.optional(),
  fatalitiesLEA: count.optional(),
  injuredLEA: count.optional(),
  establishmentsBurned: count.optional(),
  familiesAffected: count.optional(),
  individualsAffected: count.optional(),
  estimatedDamages: amount,
  finalEstimatedDamages: amount,
});

const resourcesSchema = z.object({
  respondingTeam: optionalText(200),
  fireTrucksResponded: count.optional(),
  trucksBFPOwned: count.optional(),
  trucksVolunteer: count.optional(),
  trucksBFPManned: count.optional(),
  ambulancesResponded: count.optional(),
  ambulancesBFPOwned: count.optional(),
  ambulancesVolunteer: count.optional(),
  ambulancesBFPManned: count.optional(),
});

const personnelSchema = z.object({
  groundCommander: text(200),
  arsonInvestigator: text(200),
  sender: text(200),
});

const incidentDetails = {
  categoryId: z.uuid('Invalid incident category ID'),
  subcategoryId: z
    .uuid('Invalid incident subcategory ID')
    .optional()
    .nullable(),
  establishmentId: z.uuid('Invalid establishment ID').optional().nullable(),
  dateTimeReported: optionalDate,
  dateTimeFireIncident: optionalDate,
  dateTimeCallReceived: optionalDate,
  dateTimeUnresponded: optionalDate,
  remarks: optionalText(2000),
};

export const createFireIncidentSchema = z.object({
  ...incidentDetails,
  location: z
    .object({
      placeOfOccurence: text(500),
      barangay: text(200),
      latitude: latitude.optional(),
      longitude: longitude.optional(),
    })
    .refine(bothOrNeither, coordinatesMessage),
  initialEntry: timelineEntrySchema,
});
export type CreateFireIncidentInput = z.infer<typeof createFireIncidentSchema>;

export const updateFireIncidentSchema = z.object({
  categoryId: incidentDetails.categoryId.optional(),
  subcategoryId: incidentDetails.subcategoryId,
  establishmentId: incidentDetails.establishmentId,
  dateTimeReported: incidentDetails.dateTimeReported,
  dateTimeFireIncident: incidentDetails.dateTimeFireIncident,
  dateTimeCallReceived: incidentDetails.dateTimeCallReceived,
  dateTimeUnresponded: incidentDetails.dateTimeUnresponded,
  remarks: incidentDetails.remarks,
  location: z
    .object({
      placeOfOccurence: text(500).optional(),
      barangay: text(200).optional(),
      latitude: latitude.optional(),
      longitude: longitude.optional(),
    })
    .refine(bothOrNeither, coordinatesMessage)
    .optional(),
  impact: impactSchema.optional(),
  resources: resourcesSchema.optional(),
  personnel: personnelSchema.optional(),
});
export type UpdateFireIncidentInput = z.infer<typeof updateFireIncidentSchema>;

export const rejectFireIncidentSchema = z.object({
  remarks: text(1000),
});
export type RejectFireIncidentInput = z.infer<typeof rejectFireIncidentSchema>;

// The body is optional: staff removals need no reason.
export const deleteFireIncidentSchema = z
  .object({
    // Required for SUPER_ADMIN: the memo reference and Chief BFP approval.
    reason: optionalText(1000),
  })
  .default({});
export type DeleteFireIncidentInput = z.infer<typeof deleteFireIncidentSchema>;

export const voidTimelineEntrySchema = z.object({
  reason: text(1000),
});
export type VoidTimelineEntryInput = z.infer<typeof voidTimelineEntrySchema>;

export const correctTimelineEntrySchema = z.object({
  reason: text(1000),
  entry: timelineEntrySchema,
});
export type CorrectTimelineEntryInput = z.infer<
  typeof correctTimelineEntrySchema
>;

export const listFireIncidentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  status: z.enum(FireIncidentStatus).optional(),
  approvalStatus: z.enum(IncidentApprovalStatus).optional(),
  categoryId: z.uuid().optional(),
  search: z.string().trim().max(100).optional(),
  // Filters on the incident's submission time.
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type ListFireIncidentsQuery = z.infer<
  typeof listFireIncidentsQuerySchema
>;

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});
export type PageQuery = z.infer<typeof pageQuerySchema>;
