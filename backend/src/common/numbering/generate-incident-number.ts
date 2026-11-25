import { Prisma } from '../../generated/prisma/client.js';
import { ResponseType } from '../../generated/prisma/enums.js';

// Number prefix per response type (REQUIREMENTS.md FR-INC-005).
export const RESPONSE_TYPE_CODE: Record<ResponseType, string> = {
  [ResponseType.FIRE]: 'FIR',
  [ResponseType.EMS]: 'EMS',
  [ResponseType.SPECIAL_RESCUE]: 'SRF',
};

// The Philippines' local year and month of a timestamp.
export function manilaYearMonth(date: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
  };
}

export function formatIncidentNumber(
  responseType: ResponseType,
  year: number,
  month: number,
  regionCode: string,
  sequence: number,
): string {
  return [
    RESPONSE_TYPE_CODE[responseType],
    year,
    String(month).padStart(2, '0'),
    regionCode,
    String(sequence).padStart(6, '0'),
  ].join('-');
}

// <FIR|EMS|SRF>-YYYY-MM-<REGIONCODE>-NNNNNN. Must run inside the transaction
// that creates the incident, so a rolled-back create doesn't use a number.
export async function generateIncidentNumber(
  tx: Prisma.TransactionClient,
  regionCode: string,
  responseType: ResponseType,
  date: Date = new Date(),
): Promise<string> {
  const { year, month } = manilaYearMonth(date);
  const normalizedRegionCode = regionCode.trim().toUpperCase();

  if (!normalizedRegionCode) {
    throw new Error('Region code is required');
  }

  const counter = await tx.incidentNumberCounter.upsert({
    where: {
      year_month_regionCode_responseType: {
        year,
        month,
        regionCode: normalizedRegionCode,
        responseType,
      },
    },
    create: {
      year,
      month,
      regionCode: normalizedRegionCode,
      responseType,
      lastNumber: 1,
    },
    update: { lastNumber: { increment: 1 } },
    select: { lastNumber: true },
  });

  return formatIncidentNumber(
    responseType,
    year,
    month,
    normalizedRegionCode,
    counter.lastNumber,
  );
}
