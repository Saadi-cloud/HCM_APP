import { api } from "../utils/Api";
import { addDays, apiDateKey, parseApiDateTime } from "../utils/dateTime";
import {
  asRecordList,
  extractSavedPunch,
  extractSavedRecord,
  findMatchingCheckIn,
  findMatchingCheckOut,
  findMatchingPunch,
  normalizePunch,
  normalizeRecord,
} from "./attendancePayload";

export async function fetchPunchList(employeeId, fromDateKey, toDateKey) {
  const response = await api.get("/api/HrAttPunchRaw/GetHrAttPunchRawList", {
    params: { employeeId, fromDate: fromDateKey, toDate: toDateKey },
  });
  return asRecordList(response?.data)
    .map(normalizePunch)
    .filter((punch) => punch && Number(punch.employeE_ID) === Number(employeeId));
}

export async function submitPunch(payload) {
  let saved = null;
  let requestError = null;
  try {
    const response = await api.post("/api/HrAttPunchRaw/SaveHrAttPunchRaw", payload);
    saved = extractSavedPunch(response?.data);
  } catch (error) {
    requestError = error;
  }

  const punchAt = parseApiDateTime(payload.puncH_DATETIME);
  const dateKey = apiDateKey(payload.puncH_DATETIME);
  let confirmed = null;
  try {
    const punches = await fetchPunchList(payload.employeE_ID, addDays(dateKey, -1), addDays(dateKey, 1));
    confirmed =
      (saved && punches.find((punch) => Number(punch.puncH_ID) === Number(saved.puncH_ID))) ||
      findMatchingPunch(punches, {
        employeeId: payload.employeE_ID,
        punchType: payload.puncH_TYPE,
        punchAt,
      });
  } catch (error) {
    if (requestError) throw requestError;
    if (saved && Number(saved.employeE_ID) === Number(payload.employeE_ID)) return saved;
    throw error;
  }

  if (confirmed) return confirmed;
  if (requestError) throw requestError;
  if (saved && Number(saved.employeE_ID) === Number(payload.employeE_ID)) return saved;
  throw new Error("The server did not confirm the punch. Your attendance was not recorded.");
}

export async function fetchAttendanceList(employeeId, fromDateKey, toDateKey) {
  const response = await api.get("/api/HrAttDaily/GetHrAttDailyList", {
    params: { employeeId, fromDate: fromDateKey, toDate: toDateKey },
  });
  return asRecordList(response?.data)
    .map(normalizeRecord)
    .filter((record) => record && Number(record.employeE_ID) === Number(employeeId));
}

async function fetchAround(employeeId, dateKey) {
  return fetchAttendanceList(employeeId, addDays(dateKey, -1), addDays(dateKey, 1));
}

// A timed-out save may still have been committed, so the server list is the source of truth.
export async function submitCheckIn(payload) {
  let saved = null;
  let requestError = null;
  try {
    const response = await api.post("/api/HrAttDaily/SaveHrAttDaily", payload);
    saved = extractSavedRecord(response?.data);
  } catch (error) {
    requestError = error;
  }

  const dateKey = payload.attendancE_DATE.slice(0, 10);
  let confirmed = null;
  try {
    const records = await fetchAround(payload.employeE_ID, dateKey);
    confirmed =
      (saved && records.find((record) => Number(record.attendancE_ID) === Number(saved.attendancE_ID))) ||
      findMatchingCheckIn(records, {
        employeeId: payload.employeE_ID,
        dateKey,
        actualIn: parseApiDateTime(payload.actuaL_IN),
      });
  } catch (error) {
    if (requestError) throw requestError;
    if (saved && Number(saved.employeE_ID) === Number(payload.employeE_ID)) return saved;
    throw error;
  }

  if (confirmed) return confirmed;
  if (requestError) throw requestError;
  if (saved && Number(saved.employeE_ID) === Number(payload.employeE_ID)) return saved;
  throw new Error("The server did not confirm the check-in. Check your attendance history before trying again.");
}

export async function submitCheckOut(payload) {
  let requestError = null;
  let saved = null;
  try {
    const response = await api.put("/api/HrAttDaily/UpdateHrAttDaily", payload);
    saved = extractSavedRecord(response?.data);
  } catch (error) {
    requestError = error;
  }

  const actualOut = parseApiDateTime(payload.actuaL_OUT);
  let confirmed = null;
  try {
    const records = await fetchAround(payload.employeE_ID, payload.attendancE_DATE.slice(0, 10));
    confirmed = findMatchingCheckOut(records, { attendanceId: payload.attendancE_ID, actualOut });
  } catch (error) {
    if (requestError) throw requestError;
    throw error;
  }

  if (confirmed) return confirmed;
  if (requestError) throw requestError;
  if (saved && Number(saved.attendancE_ID) !== Number(payload.attendancE_ID)) {
    throw new Error("The server returned a different attendance record. Contact HR before trying again.");
  }
  throw new Error("The server did not confirm the check-out. Check your attendance history before trying again.");
}

export function getAttendanceErrorMessage(error) {
  if (error?.code === "ECONNABORTED") {
    return "The request timed out. Your attendance may not be saved — check your attendance history.";
  }
  if (error?.punchSaved) {
    return "Your punch was logged, but the attendance record could not be saved. Try again — the same punch time will be reused.";
  }
  if (!error?.response) {
    return error?.message || "Unable to reach the payroll server. Check your connection.";
  }
  const data = error.response.data;
  const message = typeof data === "string" ? data : data?.message || data?.title;
  if (typeof message === "string" && message.trim() && message.length < 200) return message.trim();
  if (error.response.status === 401) return "Your session has expired. Please sign in again.";
  return "The payroll server could not save attendance. Please try again later.";
}
