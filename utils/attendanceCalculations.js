import { addDays, businessMidnight } from "./dateTime.js";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MINUTES = 24 * 60;

// Completed minutes only; change here if payroll adopts a different rounding policy.
export function elapsedMinutes(fromMs, toMs) {
  if (fromMs == null || toMs == null) return null;
  const diff = Number(toMs) - Number(fromMs);
  if (!Number.isFinite(diff)) return null;
  return Math.floor(Math.max(0, diff) / MINUTE_MS);
}

export function scheduleForDate(schedule, dateKey) {
  if (!schedule || schedule.startMinutes == null || schedule.endMinutes == null) return null;
  const midnight = businessMidnight(dateKey);
  if (midnight == null) return null;
  return {
    scheduledIn: midnight + schedule.startMinutes * MINUTE_MS,
    scheduledOut: midnight + schedule.endMinutes * MINUTE_MS,
  };
}

// An overnight shift that started yesterday still owns check-ins shortly after midnight.
export function resolveAttendanceDate(schedule, nowMs, todayKey, windowHours = 6) {
  if (!schedule || schedule.endMinutes <= DAY_MINUTES) return todayKey;
  const yesterdayKey = addDays(todayKey, -1);
  const yesterday = scheduleForDate(schedule, yesterdayKey);
  if (yesterday && nowMs <= yesterday.scheduledOut + windowHours * HOUR_MS) {
    const today = scheduleForDate(schedule, todayKey);
    if (!today || nowMs < today.scheduledIn - windowHours * HOUR_MS) return yesterdayKey;
  }
  return todayKey;
}

export function calculateLateMinutes(actualIn, scheduledIn) {
  if (scheduledIn == null) return null;
  return elapsedMinutes(scheduledIn, actualIn);
}

export function calculateCheckOutMinutes({ actualIn, actualOut, scheduledIn, scheduledOut }) {
  return {
    workMinutes: elapsedMinutes(actualIn, actualOut) ?? 0,
    lateMinutes: calculateLateMinutes(actualIn, scheduledIn),
    earlyOutMinutes: scheduledOut == null ? null : elapsedMinutes(actualOut, scheduledOut),
    overtimeMinutes: scheduledOut == null ? null : elapsedMinutes(scheduledOut, actualOut),
  };
}
