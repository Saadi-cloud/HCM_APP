import { addDays, businessDateKey, businessMidnight, parseApiDateTime } from "./dateTime.js";

export const DAY_TYPES = {
  FULL: "FULL",
  FIRST_HALF: "FIRST_HALF",
  SECOND_HALF: "SECOND_HALF",
};

export const DAY_TYPE_LABELS = {
  FULL: "Full Day",
  FIRST_HALF: "First Half",
  SECOND_HALF: "Second Half",
};

export function dayTypeDays(dayType) {
  if (dayType === DAY_TYPES.FIRST_HALF || dayType === DAY_TYPES.SECOND_HALF) return 0.5;
  return 1;
}

export function isSunday(dateKey) {
  const midnight = businessMidnight(dateKey);
  if (midnight == null) return false;
  return new Date(midnight + 5 * 60 * 60 * 1000).getUTCDay() === 0;
}

export function eachDateKey(fromKey, toKey) {
  if (!fromKey || !toKey || fromKey > toKey) return [];
  const keys = [];
  let cursor = fromKey;
  while (cursor <= toKey) {
    keys.push(cursor);
    cursor = addDays(cursor, 1);
    if (!cursor) break;
  }
  return keys;
}

export function buildLeaveDetailRows({ fromKey, toKey, fromDayType, toDayType }) {
  const keys = eachDateKey(fromKey, toKey);
  if (keys.length === 0) return [];

  return keys.map((dateKey, index) => {
    let dayType = DAY_TYPES.FULL;
    if (keys.length === 1) dayType = fromDayType || DAY_TYPES.FULL;
    else if (index === 0) dayType = fromDayType || DAY_TYPES.FULL;
    else if (index === keys.length - 1) dayType = toDayType || DAY_TYPES.FULL;

    const sunday = isSunday(dateKey);
    const leaveDays = sunday ? 0 : dayTypeDays(dayType);

    return {
      leavE_DATE: `${dateKey}T00:00:00`,
      daY_TYPE: dayType,
      leavE_DAYS: leaveDays,
      weekenD_FLAG: sunday ? "Y" : "N",
      holidaY_FLAG: "N",
      holidaY_ID: null,
      dateKey,
    };
  });
}

export function totalLeaveDays(rows) {
  return rows.reduce((sum, row) => sum + Number(row.leavE_DAYS || 0), 0);
}

export function formatLeaveDateShort(dateKey) {
  const match = String(dateKey ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "—";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(match[2]) - 1]} ${Number(match[3])}`;
}

export function formatSlashDate(value) {
  const ms = typeof value === "number" ? value : parseApiDateTime(value);
  if (ms == null) return "—";
  const key = businessDateKey(ms);
  const match = key.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "—";
  return `${match[3]}/${match[2]}/${match[1]}`;
}
