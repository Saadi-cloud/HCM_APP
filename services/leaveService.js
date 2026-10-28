import { api } from "../utils/Api";
import {
  asList,
  extractSavedLeaveRequest,
  isActiveFlag,
  normalizeLeaveQuota,
  normalizeLeaveReason,
  normalizeLeaveRequest,
  normalizeLeaveType,
} from "./leavePayload";

export async function fetchLeaveTypes() {
  const response = await api.get("/api/HrLeaveType/GetHrLeaveTypeList");
  return asList(response?.data)
    .map(normalizeLeaveType)
    .filter((item) => item && isActiveFlag(item.activE_FLAG))
    .sort((left, right) => Number(left.displaY_ORDER ?? 999) - Number(right.displaY_ORDER ?? 999));
}

export async function fetchLeaveReasons() {
  const response = await api.get("/api/HrLeaveReason/GetHrLeaveReasonList");
  return asList(response?.data)
    .map(normalizeLeaveReason)
    .filter((item) => item && isActiveFlag(item.activE_FLAG))
    .sort((left, right) => Number(left.displaY_ORDER ?? 999) - Number(right.displaY_ORDER ?? 999));
}

export async function fetchEmployees(companyId) {
  const response = await api.get("/Employee/GetAllEmployees", {
    params: { companyId },
  });
  return asList(response?.data).filter((item) => Number(item?.employeeId ?? item?.employeE_ID) > 0);
}

export async function fetchLeaveQuotas() {
  const response = await api.get("/api/HrLeaveQuota/GetHrLeaveQuotaList");
  return asList(response?.data)
    .map(normalizeLeaveQuota)
    .filter((item) => item && isActiveFlag(item.activE_FLAG));
}

export async function fetchLeaveHistory(employeeId, typeId) {
  const response = await api.get("/Employee/GetLeaveHistoryByEmpId", {
    params: { employeeId, typeId: String(typeId) },
  });
  return asList(response?.data);
}

export async function fetchLeaveRequests() {
  const response = await api.get("/api/HrLeaveRequestMst/GetHrLeaveRequestMstList");
  return asList(response?.data)
    .map(normalizeLeaveRequest)
    .filter(Boolean);
}

export async function submitLeaveRequest({ master, details }) {
  const response = await api.post("/api/HrLeaveRequestMst/SaveHrLeaveRequestMst", master);
  const saved = extractSavedLeaveRequest(response?.data);
  if (!saved) {
    throw new Error("The server did not return a leave request ID. Nothing was confirmed.");
  }

  const savedDetails = [];
  for (const detail of details) {
    const detailResponse = await api.post("/api/HrLeaveRequestDet/SaveHrLeaveRequestDet", {
      ...detail,
      leavE_REQUEST_ID: saved.leavE_REQUEST_ID,
    });
    savedDetails.push(detailResponse?.data);
  }

  return { master: saved, details: savedDetails };
}

export function getLeaveErrorMessage(error) {
  if (error?.code === "ECONNABORTED") {
    return "The request timed out. Check leave history before trying again.";
  }
  if (!error?.response) {
    return error?.message || "Unable to reach the payroll server. Check your connection.";
  }
  const data = error.response.data;
  const message = typeof data === "string" ? data : data?.message || data?.title;
  if (typeof message === "string" && message.trim() && message.length < 200) return message.trim();
  if (error.response.status === 401) return "Your session has expired. Please sign in again.";
  return "The payroll server could not save the leave request. Please try again later.";
}
