// Pakistan Standard Time has no daylight saving, so a fixed offset is exact.
export const BUSINESS_UTC_OFFSET_MINUTES = 5 * 60;
const OFFSET_MS = BUSINESS_UTC_OFFSET_MINUTES * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (value) => String(value).padStart(2, "0");

function shifted(ms) {
  return new Date(Number(ms) + OFFSET_MS);
}

export function businessDateKey(ms = Date.now()) {
  const date = shifted(ms);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function formatBusinessDateTime(ms) {
  const date = shifted(ms);
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

export function businessMidnight(dateKey) {
  const match = String(dateKey ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) - OFFSET_MS;
}

export function addDays(dateKey, days) {
  const midnight = businessMidnight(dateKey);
  if (midnight == null) return null;
  return businessDateKey(midnight + days * DAY_MS);
}

export function parseApiDateTime(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text || text.startsWith("0001-")) return null;

  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(text)) {
    const parsed = Date.parse(text);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;
  return (
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4] ?? 0),
      Number(match[5] ?? 0),
      Number(match[6] ?? 0)
    ) - OFFSET_MS
  );
}

export function apiDateKey(value) {
  const ms = parseApiDateTime(value);
  return ms == null ? null : businessDateKey(ms);
}

export function startOfMonthKey(ms = Date.now()) {
  return `${businessDateKey(ms).slice(0, 8)}01`;
}

export function formatTimeLabel(ms) {
  if (ms == null || !Number.isFinite(Number(ms))) return "—";
  const date = shifted(ms);
  const hours = date.getUTCHours();
  return `${hours % 12 || 12}:${pad(date.getUTCMinutes())} ${hours >= 12 ? "PM" : "AM"}`;
}

export function formatDateLabel(dateKey) {
  const match = String(dateKey ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "—";
  const weekday = WEEKDAYS[new Date(Date.UTC(+match[1], +match[2] - 1, +match[3])).getUTCDay()];
  return `${weekday}, ${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

export function formatDateTimeLabel(ms) {
  if (ms == null) return "—";
  return `${formatDateLabel(businessDateKey(ms))}, ${formatTimeLabel(ms)}`;
}

export function dateKeyFromPicker(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function pickerDateFromKey(dateKey) {
  const match = String(dateKey ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
}
