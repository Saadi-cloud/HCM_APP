import * as SecureStore from "expo-secure-store";

const profileKey = (employeeId) => `hcm.profile.${employeeId}`;

export function toCachedProfile(employee) {
  if (!employee || typeof employee !== "object") return null;
  return {
    employeeId: employee.employeeId ?? null,
    employeeFirstName: employee.employeeFirstName ?? "",
    employeeMiddleName: employee.employeeMiddleName ?? "",
    employeeLastName: employee.employeeLastName ?? "",
    employeePermanentAddress: employee.employeePermanentAddress ?? "",
    employeeMobile: employee.employeeMobile ?? "",
    employeeEmail: employee.employeeEmail ?? "",
    employeeTypeId: employee.employeeTypeId ?? null,
    shiftId: employee.shiftId ?? null,
    companyName: employee.company?.companyName ?? employee.companyName ?? "",
    departmentName: employee.department?.departmentName ?? "",
    designationName: employee.designation?.designationName ?? employee.desiG_NAME ?? "",
    emaiL_ADDRESS: employee.emaiL_ADDRESS ?? "",
    fullName: employee.fullName ?? "",
  };
}

export async function saveProfileCache(employeeId, employee) {
  const cached = toCachedProfile(employee);
  if (!cached || Number(employeeId) <= 0) return;
  await SecureStore.setItemAsync(profileKey(employeeId), JSON.stringify(cached));
}

export async function readProfileCache(employeeId) {
  if (Number(employeeId) <= 0) return null;
  const stored = await SecureStore.getItemAsync(profileKey(employeeId));
  if (!stored) return null;
  return JSON.parse(stored);
}

export async function clearProfileCache(employeeId) {
  if (Number(employeeId) <= 0) return;
  try {
    await SecureStore.deleteItemAsync(profileKey(employeeId));
  } catch {
    // The cache may not exist yet.
  }
}
