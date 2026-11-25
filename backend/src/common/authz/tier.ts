import { OfficeType } from '../../generated/prisma/enums.js';

// Office tiers (REQUIREMENTS.md §2.1, §7.1). The office structure is the FIIS
// one; a user's tier is the tier of their office.
export type Tier = 'NHQ' | 'REGIONAL' | 'DISTRICT_PROVINCE' | 'STATION';

export const OFFICE_TIER: Record<OfficeType, Tier> = {
  [OfficeType.NATIONAL_HEADQUARTERS]: 'NHQ',
  [OfficeType.REGIONAL_OFFICE]: 'REGIONAL',
  [OfficeType.DISTRICT_FIRE_STATION]: 'DISTRICT_PROVINCE',
  [OfficeType.PROVINCIAL_FIRE_STATION]: 'DISTRICT_PROVINCE',
  [OfficeType.CITY_FIRE_STATION]: 'STATION',
  [OfficeType.MUNICIPAL_FIRE_STATION]: 'STATION',
};

export function tierOf(officeType: OfficeType): Tier {
  return OFFICE_TIER[officeType];
}

export function isStation(officeType: OfficeType): boolean {
  return tierOf(officeType) === 'STATION';
}
