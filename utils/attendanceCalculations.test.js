import assert from "assert";
import {
  calculateCheckOutMinutes,
  calculateLateMinutes,
  elapsedMinutes,
  resolveAttendanceDate,
  scheduleForDate,
} from "./attendanceCalculations.js";
import {
  addDays,
  apiDateKey,
  businessDateKey,
  formatBusinessDateTime,
  formatTimeLabel,
  parseApiDateTime,
  startOfMonthKey,
} from "./dateTime.js";
import { resolveShiftSchedule } from "./shift.js";

const pkt = (text) => parseApiDateTime(text);

// Pakistan time conversions
assert.strictEqual(formatBusinessDateTime(Date.parse("2026-10-16T04:15:00Z")), "2026-10-16T09:15:00");
assert.strictEqual(businessDateKey(Date.parse("2026-10-15T19:30:00Z")), "2026-10-16");
assert.strictEqual(pkt("2026-10-16T09:15:00"), Date.parse("2026-10-16T04:15:00Z"));
assert.strictEqual(pkt("2026-10-16T04:15:00Z"), Date.parse("2026-10-16T04:15:00Z"));
assert.strictEqual(pkt("0001-01-01T00:00:00"), null);
assert.strictEqual(pkt(null), null);
assert.strictEqual(apiDateKey("2026-10-16T00:00:00"), "2026-10-16");
assert.strictEqual(addDays("2026-10-31", 1), "2026-11-01");
assert.strictEqual(addDays("2026-03-01", -1), "2026-02-28");
assert.strictEqual(startOfMonthKey(Date.parse("2026-10-16T10:00:00Z")), "2026-10-01");
assert.strictEqual(startOfMonthKey(Date.parse("2026-10-31T20:00:00Z")), "2026-11-01");
assert.strictEqual(formatTimeLabel(pkt("2026-10-16T18:20:00")), "6:20 PM");

// Prompt example: 09:00–18:00 scheduled, 09:15–18:20 actual
const example = calculateCheckOutMinutes({
  scheduledIn: pkt("2026-10-16T09:00:00"),
  scheduledOut: pkt("2026-10-16T18:00:00"),
  actualIn: pkt("2026-10-16T09:15:00"),
  actualOut: pkt("2026-10-16T18:20:00"),
});
assert.deepStrictEqual(example, { workMinutes: 545, lateMinutes: 15, earlyOutMinutes: 0, overtimeMinutes: 20 });

// Early arrival and early departure
const early = calculateCheckOutMinutes({
  scheduledIn: pkt("2026-10-16T09:00:00"),
  scheduledOut: pkt("2026-10-16T18:00:00"),
  actualIn: pkt("2026-10-16T08:57:00"),
  actualOut: pkt("2026-10-16T17:30:00"),
});
assert.deepStrictEqual(early, { workMinutes: 513, lateMinutes: 0, earlyOutMinutes: 30, overtimeMinutes: 0 });

// No schedule means no late/early/overtime figures
const unscheduled = calculateCheckOutMinutes({
  actualIn: pkt("2026-10-16T09:00:00"),
  actualOut: pkt("2026-10-16T10:00:30"),
  scheduledIn: null,
  scheduledOut: null,
});
assert.deepStrictEqual(unscheduled, { workMinutes: 60, lateMinutes: null, earlyOutMinutes: null, overtimeMinutes: null });
assert.strictEqual(calculateLateMinutes(pkt("2026-10-16T09:00:59"), pkt("2026-10-16T09:00:00")), 0);
assert.strictEqual(elapsedMinutes(10, 5), 0);

// Overnight shift 22:00 → 06:00
const night = resolveShiftSchedule({ shifT_ID: 3, shifT_NAME: "Night", timE_IN_MIN: 1320, timE_OUT_MIN: 360 });
assert.strictEqual(night.endMinutes, 1800);
assert.strictEqual(night.overnight, true);
const nightInstance = scheduleForDate(night, "2026-10-16");
assert.strictEqual(formatBusinessDateTime(nightInstance.scheduledIn), "2026-10-16T22:00:00");
assert.strictEqual(formatBusinessDateTime(nightInstance.scheduledOut), "2026-10-17T06:00:00");

const overnight = calculateCheckOutMinutes({
  ...nightInstance,
  actualIn: pkt("2026-10-16T22:10:00"),
  actualOut: pkt("2026-10-17T06:30:00"),
});
assert.deepStrictEqual(overnight, { workMinutes: 500, lateMinutes: 10, earlyOutMinutes: 0, overtimeMinutes: 30 });

assert.strictEqual(resolveAttendanceDate(night, pkt("2026-10-17T00:30:00"), "2026-10-17"), "2026-10-16");
assert.strictEqual(resolveAttendanceDate(night, pkt("2026-10-17T21:50:00"), "2026-10-17"), "2026-10-17");

const day = resolveShiftSchedule({ shifT_ID: 1, timE_IN_MIN: 540, timE_OUT_MIN: 1080 });
assert.strictEqual(resolveAttendanceDate(day, pkt("2026-10-17T00:30:00"), "2026-10-17"), "2026-10-17");
assert.strictEqual(resolveAttendanceDate(null, pkt("2026-10-17T08:00:00"), "2026-10-17"), "2026-10-17");

console.log("attendance calculation tests passed");
