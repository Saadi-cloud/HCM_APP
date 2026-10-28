import { formatBusinessDateTime } from "../utils/dateTime.js";
import { buildLeaveDetailRows, DAY_TYPES, totalLeaveDays } from "../utils/leaveDays.js";

const lowerKey = (key) => String(key).toLowerCase().replace(/_/g, "");

export function asList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

export function normalizeLeaveType(raw) {
  if (!raw || typeof raw !== "object") return null;
  const map = {};
  Object.keys(raw).forEach((key) => {
    map[lowerKey(key)] = raw[key];
  });
  const id = Number(map.leavetypeid);
  if (!(id > 0)) return null;
  return {
    leavE_TYPE_ID: id,
    leavE_TYPE_CODE: map.leavetypecode ?? null,
    leavE_TYPE_NAME: map.leavetypename ?? null,
    displaY_ORDER: map.displayorder ?? null,
    paiD_FLAG: map.paidflag ?? null,
    halF_DAY_ALLOWED: map.halfdayallowed ?? null,
    attachmenT_REQUIRED: map.attachmentrequired ?? null,
    activE_FLAG: map.activeflag ?? null,
  };
}

export function normalizeLeaveQuota(raw) {
  if (!raw || typeof raw !== "object") return null;
  const map = {};
  Object.keys(raw).forEach((key) => {
    map[lowerKey(key)] = raw[key];
  });
  const id = Number(map.leavequotaid);
  const leaveTypeId = Number(map.leavetypeid);
  if (!(leaveTypeId > 0)) return null;
  return {
    leavE_QUOTA_ID: Number.isFinite(id) ? id : null,
    leavE_YEAR: map.leaveyear == null ? null : Number(map.leaveyear),
    leavE_TYPE_ID: leaveTypeId,
    allocateD_DAYS: map.allocateddays == null ? null : Number(map.allocateddays),
    effectivE_FROM: map.effectivefrom ?? null,
    effectivE_TO: map.effectiveto ?? null,
    activE_FLAG: map.activeflag ?? null,
  };
}

export function selectLeaveQuota(quotas, leaveTypeId, leaveYear) {
  const matches = (quotas ?? []).filter(
    (item) => Number(item.leavE_TYPE_ID) === Number(leaveTypeId) && isActiveFlag(item.activE_FLAG)
  );
  if (!matches.length) return null;
  const forYear = matches.find((item) => Number(item.leavE_YEAR) === Number(leaveYear));
  if (forYear) return forYear;
  return [...matches].sort((left, right) => Number(right.leavE_YEAR ?? 0) - Number(left.leavE_YEAR ?? 0))[0];
}

export function normalizeLeaveReason(raw) {
  if (!raw || typeof raw !== "object") return null;
  const map = {};
  Object.keys(raw).forEach((key) => {
    map[lowerKey(key)] = raw[key];
  });
  const id = Number(map.leavereasonid);
  if (!(id > 0)) return null;
  return {
    leavE_REASON_ID: id,
    leavE_TYPE_ID: map.leavetypeid == null ? null : Number(map.leavetypeid),
    reasoN_CODE: map.reasoncode ?? null,
    reasoN_NAME: map.reasonname ?? null,
    attachmenT_REQUIRED: map.attachmentrequired ?? null,
    displaY_ORDER: map.displayorder ?? null,
    activE_FLAG: map.activeflag ?? null,
  };
}

export function normalizeLeaveRequest(raw) {
  if (!raw || typeof raw !== "object") return null;
  const map = {};
  Object.keys(raw).forEach((key) => {
    map[lowerKey(key)] = raw[key];
  });
  const id = Number(map.leaverequestid);
  if (!(id > 0) && map.leaverequestid !== 0) return null;
  return {
    leavE_REQUEST_ID: Number.isFinite(id) ? id : 0,
    requesT_NO: map.requestno ?? null,
    employeE_ID: map.employeeid == null ? null : Number(map.employeeid),
    leavE_YEAR: map.leaveyear == null ? null : Number(map.leaveyear),
    leavE_TYPE_ID: map.leavetypeid == null ? null : Number(map.leavetypeid),
    leavE_REASON_ID: map.leavereasonid == null ? null : Number(map.leavereasonid),
    froM_DATE: map.fromdate ?? null,
    tO_DATE: map.todate ?? null,
    froM_DAY_TYPE: map.fromdaytype ?? null,
    tO_DAY_TYPE: map.todaytype ?? null,
    totaL_DAYS: map.totaldays == null ? null : Number(map.totaldays),
    comments: map.comments ?? null,
    coverinG_EMPLOYEE_ID: map.coveringemployeeid == null ? null : Number(map.coveringemployeeid),
    status: map.status ?? null,
    currenT_APPROVAL_LEVEL: map.currentapprovallevel == null ? null : Number(map.currentapprovallevel),
    submitteD_DATE: map.submitteddate ?? null,
  };
}

export function extractSavedLeaveRequest(payload) {
  const candidate = payload?.data && !Array.isArray(payload.data) ? payload.data : payload;
  const record = normalizeLeaveRequest(candidate);
  if (!record || !(Number(record.leavE_REQUEST_ID) > 0)) return null;
  return record;
}

export function employeeLabel(employee) {
  if (!employee || typeof employee !== "object") return "Employee";
  const parts = [
    employee.employeeFirstName || employee.employeE_FIRST_NAME,
    employee.employeeMiddleName || employee.employeE_MIDDLE_NAME,
    employee.employeeLastName || employee.employeE_LAST_NAME,
  ].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return (
    employee.fullName ||
    employee.employeeName ||
    employee.employeE_NAME ||
    `Employee ${employee.employeeId || employee.employeE_ID || ""}`
  ).trim();
}

export function isActiveFlag(value) {
  if (value == null || value === "") return true;
  const text = String(value).toUpperCase();
  return text === "Y" || text === "YES" || text === "1" || text === "TRUE" || text === "ACTIVE";
}

export function buildLeaveMasterPayload({
  employeeId,
  userId,
  leaveYear,
  leaveTypeId,
  leaveReasonId,
  fromKey,
  toKey,
  fromDayType,
  toDayType,
  totalDays,
  comments,
  coveringEmployeeId,
  submittedAt,
}) {
  if (!(Number(employeeId) > 0)) throw new Error("A valid employee ID is required.");
  if (!(Number(leaveTypeId) > 0)) throw new Error("Leave type is required.");
  if (!fromKey || !toKey) throw new Error("From and To dates are required.");
  if (fromKey > toKey) throw new Error("From date cannot be later than To date.");

  return {
    leavE_REQUEST_ID: 0,
    employeE_ID: Number(employeeId),
    leavE_YEAR: Number(leaveYear),
    leavE_TYPE_ID: Number(leaveTypeId),
    leavE_REASON_ID: leaveReasonId == null ? null : Number(leaveReasonId),
    froM_DATE: `${fromKey}T00:00:00`,
    tO_DATE: `${toKey}T00:00:00`,
    froM_DAY_TYPE: fromDayType || DAY_TYPES.FULL,
    tO_DAY_TYPE: toDayType || fromDayType || DAY_TYPES.FULL,
    totaL_DAYS: Number(totalDays),
    comments: comments?.trim() ? comments.trim().slice(0, 500) : null,
    coverinG_EMPLOYEE_ID: coveringEmployeeId == null ? null : Number(coveringEmployeeId),
    status: "PENDING",
    currenT_APPROVAL_LEVEL: 1,
    submitteD_DATE: formatBusinessDateTime(submittedAt ?? Date.now()),
    createD_BY: Number(userId) > 0 ? Number(userId) : null,
  };
}

export function buildLeaveDetailPayloads(leaveRequestId, rows) {
  // leaveRequestId may be 0 before SaveHrLeaveRequestMst returns the auto-increment id.
  const requestId = Number(leaveRequestId);
  return rows.map((row) => ({
    leavE_REQUEST_DET_ID: 0,
    leavE_REQUEST_ID: Number.isFinite(requestId) ? requestId : 0,
    leavE_DATE: row.leavE_DATE,
    daY_TYPE: row.daY_TYPE,
    leavE_DAYS: row.leavE_DAYS,
    weekenD_FLAG: row.weekenD_FLAG,
    holidaY_FLAG: row.holidaY_FLAG,
  }));
}

export function planLeaveRequest(input) {
  const rows = buildLeaveDetailRows(input);
  return { rows, totalDays: totalLeaveDays(rows) };
}
