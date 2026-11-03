import { api } from "../utils/Api";

const DEFAULT_EMPLOYEE_SCREENS = ["MY_LEAVE", "APPLY_LEAVE", "MY_BALANCE", "MY_ATTENDANCE", "TIME_CHANGE"];

export function normalizeMobileProfile(raw) {
  if (!raw || typeof raw !== "object") return null;
  const userId = Number(raw.userId);
  if (!(userId > 0)) return null;

  const permissions = raw.permissions && typeof raw.permissions === "object" ? raw.permissions : {};
  const screens = Array.isArray(raw.screens)
    ? raw.screens.map((item) => String(item).toUpperCase())
    : DEFAULT_EMPLOYEE_SCREENS;

  return {
    userId,
    userName: raw.userName ?? raw.username ?? null,
    employeeId: Number(raw.employeeId) > 0 ? Number(raw.employeeId) : null,
    employeeCode: raw.employeeCode ?? null,
    employeeName: raw.employeeName ?? null,
    departmentId: Number(raw.departmentId) > 0 ? Number(raw.departmentId) : null,
    departmentName: raw.departmentName ?? null,
    companyId: Number(raw.companyId) > 0 ? Number(raw.companyId) : null,
    companyName: raw.companyName ?? null,
    role: String(raw.role ?? raw.attLeaveRole ?? "EMPLOYEE").toUpperCase(),
    leaveHistoryScope: raw.leaveHistoryScope ?? null,
    permissions: {
      canApplyLeave: !!permissions.canApplyLeave,
      canViewOwnLeaveHistory: permissions.canViewOwnLeaveHistory !== false,
      canViewLeaveBalance: permissions.canViewLeaveBalance !== false,
      canViewTeamLeave: !!permissions.canViewTeamLeave,
      canViewAllLeave: !!permissions.canViewAllLeave,
      canApproveLeave: !!permissions.canApproveLeave,
      approvalLevel: Number(permissions.approvalLevel) || 0,
      canApplyTimeChange: !!permissions.canApplyTimeChange,
      canApproveTimeChange: !!permissions.canApproveTimeChange,
      canViewAttendance: permissions.canViewAttendance !== false,
      canViewTeamAttendance: !!permissions.canViewTeamAttendance,
      canViewAllAttendance: !!permissions.canViewAllAttendance,
      canViewAttendancePolicy: !!permissions.canViewAttendancePolicy,
      canManageLocationAccess: !!permissions.canManageLocationAccess,
    },
    screens,
  };
}

export async function fetchMobileUserProfile(userId) {
  const response = await api.get(`/User/GetMobileUserProfile/${userId}`);
  const profile = normalizeMobileProfile(response?.data);
  if (!profile) {
    throw new Error("Mobile user profile could not be loaded.");
  }
  return profile;
}

export function profileHasScreen(profile, screenKey) {
  return !!profile?.screens?.includes(String(screenKey).toUpperCase());
}
