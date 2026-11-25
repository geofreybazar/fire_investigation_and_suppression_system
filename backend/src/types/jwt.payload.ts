import { UUID } from 'crypto';
import {
  OfficeType,
  Section,
  UserRole,
} from '../generated/prisma/enums.js';

export interface CurrentUserJwtPayload {
  sub: UUID;
  account_number: string;
  role: UserRole;
  // OPERATIONS, EMS or SRF for encoders and section viewers; null otherwise.
  section: Section | null;
  positionId: string;
  officeId: string;
  // The tier the user works at (REQUIREMENTS.md §7.1).
  officeType: OfficeType;
  mustChangePassword?: boolean;
}
