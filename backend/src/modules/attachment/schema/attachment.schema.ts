import { z } from 'zod';

export const uploadAttachmentSchema = z.object({
  description: z.string().trim().max(500).optional(),
});
export type UploadAttachmentInput = z.infer<typeof uploadAttachmentSchema>;

export const listAttachmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // Incident attachments, investigation evidence, or both.
  kind: z.enum(['incident', 'investigation']).optional(),
});
export type ListAttachmentsQuery = z.infer<typeof listAttachmentsQuerySchema>;
