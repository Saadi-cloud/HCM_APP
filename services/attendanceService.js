import { api } from "../utils/Api";
import { addDays, apiDateKey, businessDateKey, parseApiDateTime } from "../utils/dateTime";
import {
  asRecordList,
  extractSavedPunch,
  findDailyAfterPunch,
  findMatchingPunch,
  normalizePunch,
  normalizeRecord,
} from "./attendancePayload";

const DAILY_CONFIRM_ATTEMPTS = 4;
const DAILY_CONFIRM_DELAY_MS = 500;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchPunchList(employeeId, fromDateKey, toDateKey) {
  const response = await api.get("/api/HrAttPunchRaw/GetHrAttPunchRawList", {
    params: { employeeId, fromDate: fromDateKey, toDate: toDateKey },
  });
  return asRecordList(response?.data)
    .map(normalizePunch)
    .filter((punch) => punch && Number(punch.employeE_ID) === Number(employeeId));
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

async function confirmPunch(payload, saved) {
  const punchAt = parseApiDateTime(payload.puncH_DATETIME);
  const dateKey = apiDateKey(payload.puncH_DATETIME);
  const punches = await fetchPunchList(payload.employeE_ID, addDays(dateKey, -1), addDays(dateKey, 1));
  return (
    (saved && punches.find((punch) => Number(punch.puncH_ID) === Number(saved.puncH_ID))) ||
    findMatchingPunch(punches, {
      employeeId: payload.employeE_ID,
      punchType: payload.puncH_TYPE,
      punchAt,
    }) ||
    null
  );
}

async function waitForDailyRecord(employeeId, punchType, punchAt) {
  const dateKey = businessDateKey(punchAt);
  let lastError = null;

  for (let attempt = 0; attempt < DAILY_CONFIRM_ATTEMPTS; attempt += 1) {
    if (attempt > 0) await wait(DAILY_CONFIRM_DELAY_MS);
    try {
      const records = await fetchAround(employeeId, dateKey);
      const daily = findDailyAfterPunch(records, { employeeId, punchType, punchAt });
      if (daily) return daily;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  return null;
}

// Attendance day is created/updated by TRG_HR_ATT_PUNCH_RAW_PROCESS after this insert.
export async function submitPunch(payload) {
  let saved = null;
  let requestError = null;
  try {
    const response = await api.post("/api/HrAttPunchRaw/SaveHrAttPunchRaw", payload);
    saved = extractSavedPunch(response?.data);
  } catch (error) {
    requestError = error;
  }

  let confirmed = null;
  try {
    confirmed = await confirmPunch(payload, saved);
  } catch (error) {
    if (requestError) throw requestError;
    if (saved && Number(saved.employeE_ID) === Number(payload.employeE_ID)) {
      confirmed = saved;
    } else {
      throw error;
    }
  }

  if (!confirmed) {
    if (requestError) throw requestError;
    if (saved && Number(saved.employeE_ID) === Number(payload.employeE_ID)) {
      confirmed = saved;
    } else {
      throw new Error("The server did not confirm the punch. Your attendance was not recorded.");
    }
  }

  const punchAt = parseApiDateTime(payload.puncH_DATETIME);
  const daily = await waitForDailyRecord(payload.employeE_ID, payload.puncH_TYPE, punchAt);
  if (!daily) {
    const error = new Error(
      "Your punch was saved, but the attendance day was not processed yet. Check history in a moment before trying again."
    );
    error.punchSaved = true;
    throw error;
  }

  return { punch: confirmed, daily };
}

export function getAttendanceErrorMessage(error) {
  if (error?.code === "ECONNABORTED") {
    return "The request timed out. Your attendance may not be saved — check your attendance history.";
  }
  if (error?.punchSaved) {
    return (
      error.message ||
      "Your punch was logged, but the attendance day was not processed. Check history before trying again."
    );
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
