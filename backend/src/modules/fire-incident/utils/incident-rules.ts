import { BadRequestException } from '@nestjs/common';
import {
  FireAlarmLevel,
  FireIncidentStatus,
} from '../../../generated/prisma/enums.js';

// Status and alarm rules for the incident timeline (docs/REQUIREMENTS.md
// §3.3–3.5). Pure functions: the service and repository decide when to call them.

const S = FireIncidentStatus;

// Lowest to highest. "No alarm" (null) ranks below FIRST_ALARM.
export const ALARM_ORDER: FireAlarmLevel[] = [
  FireAlarmLevel.FIRST_ALARM,
  FireAlarmLevel.SECOND_ALARM,
  FireAlarmLevel.THIRD_ALARM,
  FireAlarmLevel.FOURTH_ALARM,
  FireAlarmLevel.FIFTH_ALARM,
  FireAlarmLevel.TASK_FORCE_ALPHA,
  FireAlarmLevel.TASK_FORCE_BRAVO,
  FireAlarmLevel.TASK_FORCE_CHARLIE,
  FireAlarmLevel.TASK_FORCE_DELTA,
  FireAlarmLevel.GENERAL_ALARM,
];

// Completed statuses an investigation can be started from (§5.1).
export const INVESTIGABLE_STATUSES: FireIncidentStatus[] = [
  S.FIRE_OUT,
  S.FIRE_OUT_UPON_ARRIVAL,
];

export const INITIAL_STATUSES: FireIncidentStatus[] = [
  S.VERIFICATION,
  S.FALSE_ALARM,
  S.ON_GOING,
  S.FIRE_OUT_UPON_ARRIVAL,
];

// Allowed status changes, keyed by the current status.
const TRANSITIONS: Record<FireIncidentStatus, FireIncidentStatus[]> = {
  [S.VERIFICATION]: [
    S.ON_GOING,
    S.FIRE_UNDER_CONTROL,
    S.FIRE_OUT,
    S.FIRE_OUT_UPON_ARRIVAL,
    S.FALSE_ALARM,
  ],
  [S.ON_GOING]: [S.VERIFICATION, S.FIRE_UNDER_CONTROL, S.FIRE_OUT],
  [S.FIRE_UNDER_CONTROL]: [S.VERIFICATION, S.ON_GOING, S.FIRE_OUT],
  [S.FIRE_OUT]: [S.REKINDLE],
  [S.FIRE_OUT_UPON_ARRIVAL]: [],
  [S.FALSE_ALARM]: [],
  [S.REKINDLE]: [S.FIRE_OUT],
};

// Statuses in which a further entry may only raise the alarm (same status).
const ALARM_CAN_CHANGE_IN: FireIncidentStatus[] = [
  S.VERIFICATION,
  S.ON_GOING,
  S.FIRE_UNDER_CONTROL,
];

export interface TimelineEntryState {
  status: FireIncidentStatus;
  alarmLevel: FireAlarmLevel | null;
  occurredAt: Date;
  createdAt: Date;
  voided?: boolean;
}

export function alarmRank(level: FireAlarmLevel | null): number {
  return level === null ? 0 : ALARM_ORDER.indexOf(level) + 1;
}

// Chronological order by event time; entries saved at the same event time
// keep the order they were recorded in.
export function sortTimeline<T extends TimelineEntryState>(entries: T[]): T[] {
  return [...entries].sort(
    (a, b) =>
      a.occurredAt.getTime() - b.occurredAt.getTime() ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );
}

export function assertValidInitialEntry(entry: {
  status: FireIncidentStatus;
  alarmLevel: FireAlarmLevel | null;
}): void {
  if (!INITIAL_STATUSES.includes(entry.status)) {
    throw new BadRequestException(
      `An incident cannot start as ${entry.status}`,
    );
  }

  assertFireOutUponArrivalAlarm(entry);
}

export function assertValidTransition(
  previous: { status: FireIncidentStatus; alarmLevel: FireAlarmLevel | null },
  next: { status: FireIncidentStatus; alarmLevel: FireAlarmLevel | null },
): void {
  const alarmChanged = previous.alarmLevel !== next.alarmLevel;

  if (alarmRank(next.alarmLevel) < alarmRank(previous.alarmLevel)) {
    throw new BadRequestException('The alarm level can only go up');
  }

  if (previous.status === next.status) {
    // A same-status entry is an alarm-only change.
    if (!alarmChanged) {
      throw new BadRequestException(
        'The entry changes neither the status nor the alarm level',
      );
    }

    if (!ALARM_CAN_CHANGE_IN.includes(next.status)) {
      throw new BadRequestException(
        `The alarm level cannot change while the incident is ${next.status}`,
      );
    }

    return;
  }

  if (!TRANSITIONS[previous.status].includes(next.status)) {
    throw new BadRequestException(
      `The status cannot change from ${previous.status} to ${next.status}`,
    );
  }

  // A rekindle has no new alarm, and neither does the FIRE_OUT that ends it.
  if (
    alarmChanged &&
    (next.status === S.REKINDLE || previous.status === S.REKINDLE)
  ) {
    throw new BadRequestException(
      'The alarm level cannot change on a rekindle',
    );
  }

  assertFireOutUponArrivalAlarm(next);
}

// Checks the whole timeline as it would be after a change: voided entries are
// ignored, the rest are taken in event-time order. Adding, backdating, voiding
// and correcting entries all go through this one check.
export function assertValidTimeline(entries: TimelineEntryState[]): void {
  const active = sortTimeline(entries.filter((entry) => !entry.voided));

  if (active.length === 0) {
    throw new BadRequestException('An incident must keep at least one entry');
  }

  assertValidInitialEntry(active[0]);

  for (let i = 1; i < active.length; i++) {
    assertValidTransition(active[i - 1], active[i]);
  }
}

// The incident's current status and alarm: its latest non-voided entry.
export function currentTimelineState(entries: TimelineEntryState[]): {
  status: FireIncidentStatus;
  alarmLevel: FireAlarmLevel | null;
} {
  const active = sortTimeline(entries.filter((entry) => !entry.voided));
  const latest = active.at(-1);

  if (!latest) {
    throw new BadRequestException('An incident must keep at least one entry');
  }

  return { status: latest.status, alarmLevel: latest.alarmLevel };
}

function assertFireOutUponArrivalAlarm(entry: {
  status: FireIncidentStatus;
  alarmLevel: FireAlarmLevel | null;
}): void {
  if (
    entry.status === S.FIRE_OUT_UPON_ARRIVAL &&
    alarmRank(entry.alarmLevel) > alarmRank(FireAlarmLevel.FIRST_ALARM)
  ) {
    throw new BadRequestException(
      'FIRE_OUT_UPON_ARRIVAL is only allowed with no alarm or the first alarm',
    );
  }
}
