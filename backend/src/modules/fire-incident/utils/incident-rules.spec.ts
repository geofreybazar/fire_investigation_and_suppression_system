import { BadRequestException } from '@nestjs/common';
import {
  FireAlarmLevel,
  FireIncidentStatus,
} from '../../../generated/prisma/enums.js';
import {
  alarmRank,
  assertValidInitialEntry,
  assertValidTimeline,
  assertValidTransition,
  currentTimelineState,
  sortTimeline,
  type TimelineEntryState,
} from './incident-rules.js';

const S = FireIncidentStatus;
const A = FireAlarmLevel;

const at = (hhmm: string) => new Date(`2026-10-10T${hhmm}:00+08:00`);

const entry = (
  status: FireIncidentStatus,
  occurredAt: string,
  alarmLevel: FireAlarmLevel | null = null,
  extra: Partial<TimelineEntryState> = {},
): TimelineEntryState => ({
  status,
  alarmLevel,
  occurredAt: at(occurredAt),
  createdAt: at(occurredAt),
  ...extra,
});

const transition = (
  from: FireIncidentStatus,
  to: FireIncidentStatus,
  fromAlarm: FireAlarmLevel | null = null,
  toAlarm: FireAlarmLevel | null = fromAlarm,
) =>
  assertValidTransition(
    { status: from, alarmLevel: fromAlarm },
    { status: to, alarmLevel: toAlarm },
  );

describe('incident rules', () => {
  describe('alarmRank', () => {
    it('ranks no alarm below the first alarm and general alarm highest', () => {
      expect(alarmRank(null)).toBe(0);
      expect(alarmRank(A.FIRST_ALARM)).toBe(1);
      expect(alarmRank(A.FIFTH_ALARM)).toBeLessThan(
        alarmRank(A.TASK_FORCE_ALPHA),
      );
      expect(alarmRank(A.TASK_FORCE_DELTA)).toBeLessThan(
        alarmRank(A.GENERAL_ALARM),
      );
    });
  });

  describe('assertValidInitialEntry', () => {
    it.each([
      S.VERIFICATION,
      S.FALSE_ALARM,
      S.ON_GOING,
      S.FIRE_OUT_UPON_ARRIVAL,
    ])('allows an incident to start as %s', (status) => {
      expect(() =>
        assertValidInitialEntry({ status, alarmLevel: null }),
      ).not.toThrow();
    });

    it.each([S.FIRE_UNDER_CONTROL, S.FIRE_OUT, S.REKINDLE])(
      'rejects starting as %s',
      (status) => {
        expect(() =>
          assertValidInitialEntry({ status, alarmLevel: null }),
        ).toThrow(BadRequestException);
      },
    );

    it('rejects starting as FIRE_OUT_UPON_ARRIVAL above the first alarm', () => {
      expect(() =>
        assertValidInitialEntry({
          status: S.FIRE_OUT_UPON_ARRIVAL,
          alarmLevel: A.SECOND_ALARM,
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('assertValidTransition', () => {
    it.each([
      [S.VERIFICATION, S.ON_GOING],
      [S.ON_GOING, S.FIRE_UNDER_CONTROL],
      [S.FIRE_UNDER_CONTROL, S.FIRE_OUT],
      // Skips and backward moves among the active statuses
      [S.VERIFICATION, S.FIRE_OUT],
      [S.FIRE_UNDER_CONTROL, S.ON_GOING],
      [S.ON_GOING, S.VERIFICATION],
      [S.VERIFICATION, S.FALSE_ALARM],
      [S.VERIFICATION, S.FIRE_OUT_UPON_ARRIVAL],
      [S.FIRE_OUT, S.REKINDLE],
      [S.REKINDLE, S.FIRE_OUT],
    ])('allows %s → %s', (from, to) => {
      expect(() => transition(from, to)).not.toThrow();
    });

    it.each([
      [S.FIRE_OUT, S.ON_GOING],
      [S.FIRE_OUT, S.FIRE_UNDER_CONTROL],
      [S.FIRE_OUT, S.VERIFICATION],
      [S.ON_GOING, S.FIRE_OUT_UPON_ARRIVAL],
      [S.ON_GOING, S.FALSE_ALARM],
      [S.FIRE_UNDER_CONTROL, S.REKINDLE],
      [S.REKINDLE, S.ON_GOING],
      [S.REKINDLE, S.FIRE_UNDER_CONTROL],
      [S.FALSE_ALARM, S.ON_GOING],
      [S.FIRE_OUT_UPON_ARRIVAL, S.FIRE_OUT],
    ])('rejects %s → %s', (from, to) => {
      expect(() => transition(from, to)).toThrow(BadRequestException);
    });

    it('allows FIRE_OUT_UPON_ARRIVAL after VERIFICATION at the first alarm', () => {
      expect(() =>
        transition(
          S.VERIFICATION,
          S.FIRE_OUT_UPON_ARRIVAL,
          A.FIRST_ALARM,
          A.FIRST_ALARM,
        ),
      ).not.toThrow();
    });

    it('rejects FIRE_OUT_UPON_ARRIVAL after VERIFICATION above the first alarm', () => {
      expect(() =>
        transition(
          S.VERIFICATION,
          S.FIRE_OUT_UPON_ARRIVAL,
          A.SECOND_ALARM,
          A.SECOND_ALARM,
        ),
      ).toThrow(
        'FIRE_OUT_UPON_ARRIVAL is only allowed with no alarm or the first alarm',
      );
    });

    it('allows raising the alarm, including skipping levels', () => {
      expect(() =>
        transition(S.ON_GOING, S.ON_GOING, A.FIRST_ALARM, A.THIRD_ALARM),
      ).not.toThrow();
      expect(() =>
        transition(S.ON_GOING, S.ON_GOING, A.FIFTH_ALARM, A.GENERAL_ALARM),
      ).not.toThrow();
    });

    it('rejects lowering the alarm, or clearing it', () => {
      expect(() =>
        transition(S.ON_GOING, S.ON_GOING, A.THIRD_ALARM, A.SECOND_ALARM),
      ).toThrow('The alarm level can only go up');
      expect(() =>
        transition(S.ON_GOING, S.FIRE_UNDER_CONTROL, A.FIRST_ALARM, null),
      ).toThrow('The alarm level can only go up');
    });

    it('rejects an entry that changes nothing', () => {
      expect(() =>
        transition(S.ON_GOING, S.ON_GOING, A.FIRST_ALARM, A.FIRST_ALARM),
      ).toThrow('The entry changes neither the status nor the alarm level');
    });

    it.each([S.FIRE_OUT, S.FIRE_OUT_UPON_ARRIVAL, S.FALSE_ALARM, S.REKINDLE])(
      'rejects an alarm-only change while %s',
      (status) => {
        expect(() =>
          transition(status, status, A.FIRST_ALARM, A.SECOND_ALARM),
        ).toThrow(BadRequestException);
      },
    );

    it('rejects a new alarm on a rekindle, or on the FIRE_OUT that ends it', () => {
      expect(() =>
        transition(S.FIRE_OUT, S.REKINDLE, A.SECOND_ALARM, A.THIRD_ALARM),
      ).toThrow('The alarm level cannot change on a rekindle');
      expect(() =>
        transition(S.REKINDLE, S.FIRE_OUT, A.SECOND_ALARM, A.THIRD_ALARM),
      ).toThrow('The alarm level cannot change on a rekindle');
    });

    it('allows a rekindle that keeps the alarm level', () => {
      expect(() =>
        transition(S.FIRE_OUT, S.REKINDLE, A.SECOND_ALARM, A.SECOND_ALARM),
      ).not.toThrow();
    });
  });

  describe('assertValidTimeline', () => {
    it('accepts a full lifecycle with repeated rekindles', () => {
      expect(() =>
        assertValidTimeline([
          entry(S.VERIFICATION, '10:00'),
          entry(S.ON_GOING, '10:05', A.FIRST_ALARM),
          entry(S.ON_GOING, '10:20', A.THIRD_ALARM),
          entry(S.FIRE_UNDER_CONTROL, '11:00', A.THIRD_ALARM),
          entry(S.FIRE_OUT, '12:00', A.THIRD_ALARM),
          entry(S.REKINDLE, '13:00', A.THIRD_ALARM),
          entry(S.FIRE_OUT, '14:00', A.THIRD_ALARM),
          entry(S.REKINDLE, '15:00', A.THIRD_ALARM),
          entry(S.FIRE_OUT, '16:00', A.THIRD_ALARM),
        ]),
      ).not.toThrow();
    });

    it('orders entries by event time, not by input order', () => {
      expect(() =>
        assertValidTimeline([
          entry(S.FIRE_OUT, '12:00'),
          entry(S.ON_GOING, '10:00'),
          entry(S.FIRE_UNDER_CONTROL, '11:00'),
        ]),
      ).not.toThrow();
    });

    it('accepts a valid backdated entry between two others', () => {
      expect(() =>
        assertValidTimeline([
          entry(S.ON_GOING, '10:00'),
          entry(S.FIRE_OUT, '12:00'),
          entry(S.FIRE_UNDER_CONTROL, '11:00'),
        ]),
      ).not.toThrow();
    });

    it('rejects a backdated entry that breaks the sequence', () => {
      expect(() =>
        assertValidTimeline([
          entry(S.ON_GOING, '10:00'),
          entry(S.FIRE_OUT, '12:00'),
          entry(S.FALSE_ALARM, '11:00'),
        ]),
      ).toThrow(BadRequestException);
    });

    it('rejects a backdated entry with a lower alarm than the entry before it', () => {
      expect(() =>
        assertValidTimeline([
          entry(S.ON_GOING, '10:00', A.THIRD_ALARM),
          entry(S.FIRE_UNDER_CONTROL, '11:00', A.SECOND_ALARM),
        ]),
      ).toThrow('The alarm level can only go up');
    });

    it('rejects anything after FIRE_OUT other than REKINDLE', () => {
      expect(() =>
        assertValidTimeline([
          entry(S.ON_GOING, '10:00'),
          entry(S.FIRE_OUT, '12:00'),
          entry(S.ON_GOING, '12:30'),
        ]),
      ).toThrow(BadRequestException);
    });

    it('ignores voided entries', () => {
      expect(() =>
        assertValidTimeline([
          entry(S.ON_GOING, '10:00'),
          entry(S.FALSE_ALARM, '10:30', null, { voided: true }),
          entry(S.FIRE_OUT, '12:00'),
        ]),
      ).not.toThrow();
    });

    it('rejects a timeline whose first remaining entry is not a valid start', () => {
      expect(() =>
        assertValidTimeline([
          entry(S.VERIFICATION, '10:00', null, { voided: true }),
          entry(S.FIRE_OUT, '12:00'),
        ]),
      ).toThrow('An incident cannot start as FIRE_OUT');
    });

    it('rejects a timeline with no remaining entries', () => {
      expect(() =>
        assertValidTimeline([
          entry(S.ON_GOING, '10:00', null, { voided: true }),
        ]),
      ).toThrow('An incident must keep at least one entry');
    });
  });

  describe('sortTimeline and currentTimelineState', () => {
    it('breaks ties in event time by the order entries were saved', () => {
      const first = entry(S.ON_GOING, '10:00', null, {
        createdAt: at('10:01'),
      });
      const second = entry(S.FIRE_OUT, '10:00', null, {
        createdAt: at('10:02'),
      });

      expect(sortTimeline([second, first])).toEqual([first, second]);
    });

    it('returns the latest non-voided entry by event time', () => {
      expect(
        currentTimelineState([
          entry(S.FIRE_OUT, '12:00', A.SECOND_ALARM),
          entry(S.ON_GOING, '10:00', A.SECOND_ALARM),
          entry(S.REKINDLE, '13:00', A.SECOND_ALARM, { voided: true }),
        ]),
      ).toEqual({ status: S.FIRE_OUT, alarmLevel: A.SECOND_ALARM });
    });
  });
});
