export function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function isOpenEnded(value) {
  if (value == null || String(value).trim() === "") return true;
  return String(value).startsWith("0001-");
}

function isActiveFlag(flag) {
  if (flag == null || String(flag).trim() === "") return true;
  const value = String(flag).trim().toLowerCase();
  return value === "y" || value === "yes" || value === "1" || value === "true" || value === "a";
}

function parseDate(value) {
  if (value == null || String(value).trim() === "") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function selectApplicableShift(payload, employeeId, now = Date.now()) {
  const targetId = Number(employeeId);
  const matches = asArray(payload).filter((assignment) => {
    const assignedEmployeeId = Number(assignment?.employeE_ID ?? assignment?.employeeId);
    if (Number.isFinite(assignedEmployeeId) && assignedEmployeeId > 0 && assignedEmployeeId !== targetId) {
      return false;
    }
    if (!isActiveFlag(assignment?.activE_FLAG ?? assignment?.activeFlag)) return false;

    const starts = parseDate(assignment?.effectivE_FROM ?? assignment?.effectiveFrom);
    const ends = parseDate(assignment?.effectivE_TO ?? assignment?.effectiveTo);
    if (starts != null && starts > now) return false;
    if (!isOpenEnded(assignment?.effectivE_TO ?? assignment?.effectiveTo) && ends != null && ends < now) {
      return false;
    }
    return true;
  });

  matches.sort((left, right) => {
    const leftStart = parseDate(left?.effectivE_FROM ?? left?.effectiveFrom) ?? 0;
    const rightStart = parseDate(right?.effectivE_FROM ?? right?.effectiveFrom) ?? 0;
    return rightStart - leftStart;
  });

  return matches[0] ?? null;
}

export function formatMinutesAsTime(totalMinutes) {
  const minutes = Number(totalMinutes);
  if (!Number.isFinite(minutes)) return null;
  const normalized = ((Math.trunc(minutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(mins).padStart(2, "0")} ${period}`;
}

export function formatApiClock(value) {
  const match = String(value ?? "").match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${match[2]} ${period}`;
}

function clockMinutes(value) {
  const match = String(value ?? "").match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function buildSchedule(source, shiftId, shiftName, start, rawEnd) {
  if (!Number.isFinite(start) || !Number.isFinite(rawEnd) || start < 0) return null;
  const end = rawEnd <= start ? rawEnd + 1440 : rawEnd;
  return {
    source,
    shiftId,
    shiftName,
    startMinutes: start,
    endMinutes: end,
    scheduledInLabel: formatMinutesAsTime(start),
    scheduledOutLabel: formatMinutesAsTime(end),
    overnight: end > 1440,
  };
}

export function resolveShiftSchedule(definition) {
  if (!definition || typeof definition !== "object") return null;

  if (definition.timE_IN_MIN != null && definition.timE_OUT_MIN != null) {
    return buildSchedule(
      "HrAttShiftMst",
      definition.shifT_ID ?? null,
      definition.shifT_NAME ?? definition.shifT_CODE ?? null,
      Number(definition.timE_IN_MIN),
      Number(definition.timE_OUT_MIN)
    );
  }

  if (definition.startTime && definition.endTime) {
    const start = clockMinutes(definition.startTime);
    const end = clockMinutes(definition.endTime);
    if (start == null || end == null) return null;
    return buildSchedule(
      "Shift",
      definition.shiftId ?? null,
      definition.shiftName ?? definition.shiftAbbreviation ?? null,
      start,
      end
    );
  }

  return null;
}
