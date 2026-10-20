import { resolveSessionExpiry, stripSensitiveAuthFields } from "../utils/session.js";

export function buildLoginRequest({ username, password, company, financialYear }) {
  const trimmedUsername = String(username ?? "").trim();
  const companyId = Number(company?.companyId);
  const financialYearId = Number(financialYear?.financialYearId);
  const startingDate = financialYear?.startingDate ?? financialYear?.saleYearStartDate ?? null;
  const endingDate = financialYear?.endingDate ?? financialYear?.saleYearEndDate ?? null;

  if (!trimmedUsername) {
    throw new Error("User Name is required.");
  }
  if (!password) {
    throw new Error("Password is required.");
  }
  if (!Number.isFinite(companyId) || companyId <= 0) {
    throw new Error("Company is required.");
  }
  if (!Number.isFinite(financialYearId) || financialYearId <= 0) {
    throw new Error("Financial year is required.");
  }
  if (!startingDate || !endingDate) {
    throw new Error("The selected financial year is missing its start or end date.");
  }

  return {
    username: trimmedUsername,
    password,
    companyId,
    financialYearId,
    startingDate,
    endingDate,
    companyName: company?.companyName ?? null,
  };
}

export function sanitizeAuthResponse(data, now = Date.now()) {
  if (!data || typeof data !== "object") {
    return { ok: false, message: "Login failed. The server returned an empty response." };
  }

  const token = typeof data.token === "string" ? data.token : "";
  const userId = Number(data.userId);
  const employeeId = Number(data.employeeId);

  if (!token || !Number.isFinite(userId) || userId <= 0) {
    return { ok: false, message: "Invalid credentials." };
  }

  if (!Number.isFinite(employeeId) || employeeId <= 0) {
    return {
      ok: false,
      message: "Login succeeded, but this account has no employee ID.",
    };
  }

  const expiresAt = resolveSessionExpiry(token, data.expiryMinutes, now);
  if (!expiresAt) {
    return {
      ok: false,
      message: "Login succeeded, but the access token has no expiry. Please sign in again.",
    };
  }

  const session = stripSensitiveAuthFields({
    userId,
    username: data.username ?? null,
    employeeId,
    companyId: Number(data.companyId),
    companyName: data.companyName ?? null,
    financialYearId: Number(data.financialYearId),
    startingDate: data.startingDate ?? null,
    endingDate: data.endingDate ?? null,
    expiryMinutes: data.expiryMinutes ?? null,
    server: data.server ?? null,
    expiresAt,
  });

  return { ok: true, token, session };
}

export function getAuthErrorMessage(error) {
  if (error?.code === "ECONNABORTED") {
    return "The login request timed out. Please try again.";
  }

  if (!error?.response) {
    return "Unable to reach the payroll server. Check your connection and try again.";
  }

  const status = error.response.status;
  const data = error.response.data;
  const message = typeof data === "string" ? data : data?.message || data?.title;

  if (status === 400 || status === 401) {
    if (typeof message === "string" && message.trim() && message.length < 180) {
      return message.trim();
    }
    return "Invalid credentials.";
  }

  if (status >= 500) {
    return "The payroll server could not complete login. Please try again later.";
  }

  return "An error occurred during login. Please try again.";
}
