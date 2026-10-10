import { Prisma } from '../../../generated/prisma/client.js';
// Adjust this path to your generated Prisma client.

export async function generateIncidentNumber(
  tx: Prisma.TransactionClient,
  regionCode: string,
  date: Date = new Date(),
): Promise<string> {
  // Convert the timestamp to the Philippines' local year and month.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === 'year')?.value);

  const month = Number(parts.find((part) => part.type === 'month')?.value);

  const normalizedRegionCode = regionCode.trim().toUpperCase();

  if (!normalizedRegionCode) {
    throw new Error('Region code is required');
  }

  const counter = await tx.incidentNumberCounter.upsert({
    where: {
      year_month_regionCode: {
        year,
        month,
        regionCode: normalizedRegionCode,
      },
    },
    create: {
      year,
      month,
      regionCode: normalizedRegionCode,
      lastNumber: 1,
    },
    update: {
      lastNumber: {
        increment: 1,
      },
    },
    select: {
      lastNumber: true,
    },
  });

  const sequence = String(counter.lastNumber).padStart(6, '0');

  return `${year}-${String(month).padStart(2, '0')}-${normalizedRegionCode}-${sequence}`;
}
