import { BadRequestException } from '@nestjs/common';
import {
  assertInvestigationConcluded,
  investigationNumber,
  referralDirection,
  referralTargets,
  stationChain,
  type StationWithAncestors,
} from './investigation-rules.js';

const station: StationWithAncestors = {
  id: 'station',
  name: 'Quezon City Fire Station',
  type: 'CITY_FIRE_STATION',
  parent: {
    id: 'district',
    name: 'QC District',
    type: 'DISTRICT_FIRE_STATION',
  },
  region: {
    id: 'region',
    name: 'NCR',
    type: 'REGIONAL_OFFICE',
    parent: { id: 'nhq', name: 'NHQ', type: 'NATIONAL_HEADQUARTERS' },
  },
};

const chain = stationChain(station);

describe('investigation rules', () => {
  it('builds the chain lowest first: station, district, region, NHQ', () => {
    expect(chain.map((office) => office.id)).toEqual([
      'station',
      'district',
      'region',
      'nhq',
    ]);
  });

  describe('referralDirection', () => {
    it('allows referring up to any office above, skipping levels', () => {
      expect(referralDirection(chain, 'station', 'district')).toBe('UP');
      expect(referralDirection(chain, 'station', 'nhq')).toBe('UP');
    });

    it('allows referring down to any office below in the chain', () => {
      expect(referralDirection(chain, 'nhq', 'station')).toBe('DOWN');
      expect(referralDirection(chain, 'region', 'district')).toBe('DOWN');
    });

    it('rejects an office outside the chain', () => {
      expect(() => referralDirection(chain, 'station', 'other-region')).toThrow(
        BadRequestException,
      );
    });

    it('rejects referring to the same office', () => {
      expect(() => referralDirection(chain, 'region', 'region')).toThrow(
        'The case is already handled by that office.',
      );
    });
  });

  it('lists the referral targets with their direction', () => {
    expect(
      referralTargets(chain, 'district').map(({ id, direction }) => [
        id,
        direction,
      ]),
    ).toEqual([
      ['station', 'DOWN'],
      ['region', 'UP'],
      ['nhq', 'UP'],
    ]);
  });

  describe('assertInvestigationConcluded', () => {
    it('requires both classification and cause, and neither UNDER_INVESTIGATION', () => {
      expect(() =>
        assertInvestigationConcluded({
          classification: 'ACCIDENTAL',
          causeOfFire: 'OVERHEATED_HOME_APPLIANCES',
        }),
      ).not.toThrow();

      for (const investigation of [
        { classification: null, causeOfFire: 'OVERHEATED_HOME_APPLIANCES' },
        { classification: 'ACCIDENTAL', causeOfFire: null },
        {
          classification: 'UNDER_INVESTIGATION',
          causeOfFire: 'OVERHEATED_HOME_APPLIANCES',
        },
        { classification: 'ACCIDENTAL', causeOfFire: 'UNDER_INVESTIGATION' },
      ] as Parameters<typeof assertInvestigationConcluded>[0][]) {
        expect(() => assertInvestigationConcluded(investigation)).toThrow(
          BadRequestException,
        );
      }
    });
  });

  it('numbers investigations from 01 per incident', () => {
    expect(investigationNumber('2026-10-NCR-000123', 0)).toBe(
      'INV-2026-10-NCR-000123-01',
    );
    expect(investigationNumber('2026-10-NCR-000123', 1)).toBe(
      'INV-2026-10-NCR-000123-02',
    );
  });
});
