import {
  calculateCheckOutMinutes,
  calculateLateMinutes,
} from "../utils/attendanceCalculations.js";
import { apiDateKey, formatBusinessDateTime, parseApiDateTime } from "../utils/dateTime.js";

export const RECORD_FIELDS = [
  "attendancE_ID",
  "employeE_ID",
  "attendancE_DATE",
  "shifT_ID",
  "scheduleD_IN",
  "scheduleD_OUT",
  "actuaL_IN",
  "actuaL_OUT",
  "worK_MINUTES",
  "latE_MINUTES",
  "earlY_OUT_MINUTES",
  "oT_MINUTES",
  "attendancE_STATUS",
  "leavE_REQUEST_ID",
  "weekenD_FLAG",
  "holidaY_FLAG",
  "manuaL_FLAG",
  "remarks",
  "processeD_DATE",
  "createD_DATE",
  "updateD_DATE",
];

const lowerKey = (key) => key.toLowerCase().replace(/_/g, "");

export function asRecordList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

export function normalizeRecord(raw) {
  if (!raw || typeof raw !== "object") return null;
  const byLowerKey = {};
  Object.keys(raw).forEach((key) => {
    byLowerKey[lowerKey(key)] = raw[key];
  });
  const record = {};
  RECORD_FIELDS.forEach((field) => {
    const value = byLowerKey[lowerKey(field)];
    record[field] = value === undefined ? null : value;
  });
  return record;
}

export function extractSavedRecord(payload) {
  const candidate = payload?.data && !Array.isArray(payload.data) ? payload.data : payload;
  const record = normalizeRecord(candidate);
  if (!record || !(Number(record.attendancE_ID) > 0)) return null;
  return record;
}

export function isOpenRecord(record) {
  return !!record && parseApiDateTime(record.actuaL_IN) != null && parseApiDateTime(record.actuaL_OUT) == null;
}

export function recordDateKey(record) {
  return apiDateKey(record?.attendancE_DATE);
}

export function buildRemarks({ testMode, reason, existing }) {
  const parts = [];
  if (existing && String(existing).trim()) {
    parts.push(String(existing).trim());
  } else if (testMode) {
    parts.push("TEST DATA (app)");
  }
  if (reason && String(reason).trim()) {
    parts.push(String(reason).trim());
  }
  const text = parts.join(" | ");
  return text ? text.slice(0, 500) : null;
}

export function buildCheckInPayload({
  employeeId,
  shiftId,
  dateKey,
  scheduleInstance,
  actualIn,
  reason,
  testMode,
  defaults,
}) {
  if (!(Number(employeeId) > 0)) throw new Error("A valid employee ID is required.");
  if (!dateKey) throw new Error("The attendance date could not be determined.");
  if (actualIn == null) throw new Error("The check-in time is missing.");

  const scheduledIn = scheduleInstance?.scheduledIn ?? null;
  const scheduledOut = scheduleInstance?.scheduledOut ?? null;

  return {
    attendancE_ID: 0,
    employeE_ID: Number(employeeId),
    attendancE_DATE: `${dateKey}T00:00:00`,
    shifT_ID: Number(shiftId) > 0 ? Number(shiftId) : null,
    scheduleD_IN: scheduledIn == null ? null : formatBusinessDateTime(scheduledIn),
    scheduleD_OUT: scheduledOut == null ? null : formatBusinessDateTime(scheduledOut),
    actuaL_IN: formatBusinessDateTime(actualIn),
    actuaL_OUT: null,
    worK_MINUTES: 0,
    latE_MINUTES: calculateLateMinutes(actualIn, scheduledIn),
    earlY_OUT_MINUTES: 0,
    oT_MINUTES: 0,
    attendancE_STATUS: defaults.attendanceStatus,
    leavE_REQUEST_ID: null,
    weekenD_FLAG: defaults.weekendFlag,
    holidaY_FLAG: defaults.holidayFlag,
    manuaL_FLAG: defaults.manualFlag,
    remarks: buildRemarks({ testMode, reason }),
    processeD_DATE: null,
  };
}

export function buildCheckOutPayload({ record, employeeId, actualOut, reason, testMode }) {
  if (!record || !(Number(record.attendancE_ID) > 0)) {
    throw new Error("The open attendance record has no attendance ID.");
  }
  if (Number(record.employeE_ID) !== Number(employeeId)) {
    throw new Error("The attendance record does not belong to the signed-in employee.");
  }

  const actualIn = parseApiDateTime(record.actuaL_IN);
  if (actualIn == null) throw new Error("The attendance record has no check-in time.");
  if (actualOut <= actualIn) throw new Error("Check-out time must be after the check-in time.");

  const minutes = calculateCheckOutMinutes({
    actualIn,
    actualOut,
    scheduledIn: parseApiDateTime(record.scheduleD_IN),
    scheduledOut: parseApiDateTime(record.scheduleD_OUT),
  });

  return {
    ...record,
    actuaL_OUT: formatBusinessDateTime(actualOut),
    worK_MINUTES: minutes.workMinutes,
    latE_MINUTES: minutes.lateMinutes ?? record.latE_MINUTES,
    earlY_OUT_MINUTES: minutes.earlyOutMinutes,
    oT_MINUTES: minutes.overtimeMinutes,
    remarks: buildRemarks({ testMode, reason, existing: record.remarks }),
  };
}

const sameMinute = (left, right) =>
  left != null && right != null && Math.floor(left / 60000) === Math.floor(right / 60000);

export function findMatchingCheckIn(records, { employeeId, dateKey, actualIn }) {
  return (
    records.find(
      (record) =>
        Number(record.employeE_ID) === Number(employeeId) &&
        recordDateKey(record) === dateKey &&
        sameMinute(parseApiDateTime(record.actuaL_IN), actualIn)
    ) ?? null
  );
}

export function findMatchingCheckOut(records, { attendanceId, actualOut }) {
  return (
    records.find(
      (record) =>
        Number(record.attendancE_ID) === Number(attendanceId) &&
        sameMinute(parseApiDateTime(record.actuaL_OUT), actualOut)
    ) ?? null
  );
}
