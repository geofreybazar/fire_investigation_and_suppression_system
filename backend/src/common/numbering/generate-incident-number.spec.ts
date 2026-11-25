import { describe, expect, it, vi } from 'vitest';
import { ResponseType } from '../../generated/prisma/enums.js';
import {
  formatIncidentNumber,
  generateIncidentNumber,
  manilaYearMonth,
} from './generate-incident-number.js';

describe('manilaYearMonth', () => {
  it('uses the Asia/Manila month, not UTC', () => {
    // 2026-12-31 17:00 UTC is 2027-01-01 01:00 in Manila.
    expect(manilaYearMonth(new Date('2026-12-31T17:00:00Z'))).toEqual({
      year: 2027,
      month: 1,
    });
  });
});

describe('formatIncidentNumber', () => {
  it.each([
    [ResponseType.FIRE, 'FIR-2027-01-R4A-000123'],
    [ResponseType.EMS, 'EMS-2027-01-R4A-000123'],
    [ResponseType.SPECIAL_RESCUE, 'SRF-2027-01-R4A-000123'],
  ])('prefixes %s numbers', (type, expected) => {
    expect(formatIncidentNumber(type, 2027, 1, 'R4A', 123)).toBe(expected);
  });
});

describe('generateIncidentNumber', () => {
  it('increments the counter keyed by month, region and response type', async () => {
    const upsert = vi.fn().mockResolvedValue({ lastNumber: 7 });
    const tx = { incidentNumberCounter: { upsert } } as never;

    const number = await generateIncidentNumber(
      tx,
      ' r4a ',
      ResponseType.EMS,
      new Date('2027-03-10T00:00:00Z'),
    );

    expect(number).toBe('EMS-2027-03-R4A-000007');
    expect(upsert.mock.calls[0][0].where).toEqual({
      year_month_regionCode_responseType: {
        year: 2027,
        month: 3,
        regionCode: 'R4A',
        responseType: ResponseType.EMS,
      },
    });
  });

  it('refuses an empty region code', async () => {
    const tx = { incidentNumberCounter: { upsert: vi.fn() } } as never;
    await expect(
      generateIncidentNumber(tx, '  ', ResponseType.FIRE),
    ).rejects.toThrow('Region code is required');
  });
});
