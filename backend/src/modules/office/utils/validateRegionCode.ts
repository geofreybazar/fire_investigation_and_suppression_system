import { BadRequestException } from '@nestjs/common';
import { OfficeType } from '../../../generated/prisma/enums.js';

export function validateRegionCode(
  type: OfficeType,
  regionCode?: string | null,
): void {
  if (type === 'REGIONAL_OFFICE') {
    if (!regionCode?.trim()) {
      throw new BadRequestException(
        'A region code is required for regional offices',
      );
    }

    return;
  }

  if (regionCode?.trim()) {
    throw new BadRequestException(
      'A region code is only allowed for regional offices',
    );
  }
}
