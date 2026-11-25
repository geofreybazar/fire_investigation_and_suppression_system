import z from "zod";
import { normalizeInput } from "@/utils/normalizeInput";

import type { Office } from "../office/office";
import type { Position } from "../positions/positions";
import type { Pagination } from "../pagination";
import { RANKS, SECTIONS, USER_ROLES } from "@/constants/personnel";

export const changePasswordSchema = z.object({
  userId: z.string(),
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(12, "Password must be at least 12 characters long.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number.")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character.",
    ),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const addNewUserSchema = z
  .object({
    account_number: z
      .string()
      .min(6, "Invalid Account number")
      .max(10, "Invalid Account number")
      .transform((value) => value.toUpperCase()),
    rank: z.enum(RANKS),
    first_name: z.string().trim().min(2).transform(normalizeInput),
    last_name: z.string().trim().min(2).transform(normalizeInput),
    middle_name: z.string().trim().transform(normalizeInput).optional(),
    email: z
      .email()
      .trim()
      .transform((value) => value.trim().toLowerCase()),
    role: z.enum(USER_ROLES, { error: "Please select a role." }),
    // Required for encoders and station viewers (REQUIREMENTS.md FR-USR-002);
    // the backend checks it against the office too.
    section: z.enum(SECTIONS).nullable(),
    sectionDesignationRef: z
      .string()
      .trim()
      .max(120)
      .nullable()
      .transform((value) => (value ? value : null)),
    officeId: z.uuid("Please select an office."),
    positionId: z.uuid("Please select a position."),
  })
  .refine((data) => data.role !== "ENCODER" || data.section !== null, {
    path: ["section"],
    message: "Encoders need a section.",
  })
  .refine(
    (data) =>
      (data.role !== "ADMIN" && data.role !== "SUPER_ADMIN") ||
      data.section === null,
    { path: ["section"], message: "Administrators have no section." },
  );
export type AddNewUserInput = z.infer<typeof addNewUserSchema>;

export interface User extends AddNewUserInput {
  id: string;
  office: Office;
  position: Position;
  isActive: boolean;
  mustChangePassword?: boolean;
}

export interface GetAllPersonnel {
  data: User[];
  pagination: Pagination;
}

export interface ChangeUserStatus {
  userId: string;
  isActive: boolean;
}

export interface EditUserInput extends AddNewUserInput {
  userId: string;
}
