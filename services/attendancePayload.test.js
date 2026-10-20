import assert from "assert";
import {
  buildCheckInPayload,
  buildCheckOutPayload,
  extractSavedRecord,
  findMatchingCheckIn,
  isOpenRecord,
  normalizeRecord,
} from "./attendancePayload.js";
import { scheduleForDate } from "../utils/attendanceCalculations.js";
import { parseApiDateTime } from "../utils/dateTime.js";
import { resolveShiftSchedule } from "../utils/shift.js";

const testDefaults = { attendanceStatus: "PRESENT", weekendFlag: "N", holidayFlag: "N", manualFlag: "N" };
const schedule = resolveShiftSchedule({ shifT_ID: 1, shifT_NAME: "General", timE_IN_MIN: 540, timE_OUT_MIN: 1080 });

const checkIn = buildCheckInPayload({
  employeeId: 180,
  shiftId: 1,
  dateKey: "2026-10-16",
  scheduleInstance: scheduleForDate(schedule, "2026-10-16"),
  actualIn: parseApiDateTime("2026-10-16T08:57:00"),
  reason: "",
  testMode: true,
  defaults: testDefaults,
});

assert.deepStrictEqual(checkIn, {
  attendancE_ID: 0,
  employeE_ID: 180,
  attendancE_DATE: "2026-10-16T00:00:00",
  shifT_ID: 1,
  scheduleD_IN: "2026-10-16T09:00:00",
  scheduleD_OUT: "2026-10-16T18:00:00",
  actuaL_IN: "2026-10-16T08:57:00",
  actuaL_OUT: null,
  worK_MINUTES: 0,
  latE_MINUTES: 0,
  earlY_OUT_MINUTES: 0,
  oT_MINUTES: 0,
  attendancE_STATUS: "PRESENT",
  leavE_REQUEST_ID: null,
  weekenD_FLAG: "N",
  holidaY_FLAG: "N",
  manuaL_FLAG: "N",
  remarks: "TEST DATA (app)",
  processeD_DATE: null,
});

const releaseCheckIn = buildCheckInPayload({
  employeeId: 7,
  shiftId: 0,
  dateKey: "2026-10-16",
  scheduleInstance: null,
  actualIn: parseApiDateTime("2026-10-16T09:20:00"),
  reason: "Traffic",
  testMode: false,
  defaults: { attendanceStatus: null, weekendFlag: null, holidayFlag: null, manualFlag: "N" },
});
assert.strictEqual(releaseCheckIn.scheduleD_IN, null);
assert.strictEqual(releaseCheckIn.latE_MINUTES, null);
assert.strictEqual(releaseCheckIn.shifT_ID, null);
assert.strictEqual(releaseCheckIn.remarks, "Traffic");
assert.strictEqual(releaseCheckIn.weekenD_FLAG, null);

// Save response from the API (unusual capitalisation preserved)
const saved = extractSavedRecord({
  attendancE_ID: 3,
  employeE_ID: 180,
  attendancE_DATE: "2026-10-16T00:00:00",
  shifT_ID: 1,
  scheduleD_IN: "2026-10-16T09:00:00",
  scheduleD_OUT: "2026-10-16T18:00:00",
  actuaL_IN: "2026-10-16T08:57:00",
  actuaL_OUT: null,
  worK_MINUTES: 0,
  latE_MINUTES: 0,
  earlY_OUT_MINUTES: 0,
  oT_MINUTES: 0,
  attendancE_STATUS: "PRESENT",
  remarks: "TEST DATA (app)",
  createD_DATE: "2026-10-16T08:57:05",
  updateD_DATE: null,
});
assert.strictEqual(saved.attendancE_ID, 3);
assert.strictEqual(isOpenRecord(saved), true);
assert.strictEqual(extractSavedRecord({ attendancE_ID: 0 }), null);
assert.strictEqual(extractSavedRecord("OK"), null);

// camelCase list responses map to the same canonical fields
const camel = normalizeRecord({ attendanceId: 9, employeeId: 180, actualIn: "2026-10-16T09:00:00", actualOut: null });
assert.strictEqual(camel.attendancE_ID, 9);
assert.strictEqual(camel.employeE_ID, 180);
assert.strictEqual(camel.actuaL_IN, "2026-10-16T09:00:00");
assert.strictEqual(camel.oT_MINUTES, null);

const checkOut = buildCheckOutPayload({
  record: saved,
  employeeId: 180,
  actualOut: parseApiDateTime("2026-10-16T18:04:00"),
  reason: "",
  testMode: true,
});
assert.strictEqual(checkOut.attendancE_ID, 3);
assert.strictEqual(checkOut.actuaL_IN, "2026-10-16T08:57:00");
assert.strictEqual(checkOut.actuaL_OUT, "2026-10-16T18:04:00");
assert.strictEqual(checkOut.worK_MINUTES, 547);
assert.strictEqual(checkOut.latE_MINUTES, 0);
assert.strictEqual(checkOut.earlY_OUT_MINUTES, 0);
assert.strictEqual(checkOut.oT_MINUTES, 4);
assert.strictEqual(checkOut.createD_DATE, "2026-10-16T08:57:05");
assert.strictEqual(checkOut.remarks, "TEST DATA (app)");

assert.throws(() =>
  buildCheckOutPayload({ record: saved, employeeId: 181, actualOut: parseApiDateTime("2026-10-16T18:04:00") })
);
assert.throws(() =>
  buildCheckOutPayload({ record: saved, employeeId: 180, actualOut: parseApiDateTime("2026-10-16T08:00:00") })
);
assert.throws(() =>
  buildCheckOutPayload({ record: { ...saved, attendancE_ID: 0 }, employeeId: 180, actualOut: Date.now() })
);

assert.strictEqual(
  findMatchingCheckIn([saved], {
    employeeId: 180,
    dateKey: "2026-10-16",
    actualIn: parseApiDateTime("2026-10-16T08:57:40"),
  }).attendancE_ID,
  3
);

console.log("attendance payload tests passed");
