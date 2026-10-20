const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function decodeBase64Url(segment) {
  if (!segment || typeof segment !== "string") return "";
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  let output = "";

  for (let index = 0; index < padded.length; index += 4) {
    const a = BASE64_CHARS.indexOf(padded[index]);
    const b = BASE64_CHARS.indexOf(padded[index + 1]);
    const c = padded[index + 2] === "=" ? -1 : BASE64_CHARS.indexOf(padded[index + 2]);
    const d = padded[index + 3] === "=" ? -1 : BASE64_CHARS.indexOf(padded[index + 3]);
    if (a < 0 || b < 0) return "";

    const bits = (a << 18) | (b << 12) | ((c < 0 ? 0 : c) << 6) | (d < 0 ? 0 : d);
    output += String.fromCharCode((bits >> 16) & 255);
    if (c >= 0) output += String.fromCharCode((bits >> 8) & 255);
    if (d >= 0) output += String.fromCharCode(bits & 255);
  }

  try {
    return decodeURIComponent(
      output
        .split("")
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
  } catch {
    return output;
  }
}

export function getJwtExpiryMs(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    const exp = Number(payload?.exp);
    if (!Number.isFinite(exp) || exp <= 0) return null;
    return exp * 1000;
  } catch {
    return null;
  }
}

export function resolveSessionExpiry(token, expiryMinutes, now = Date.now()) {
  const jwtExpiry = getJwtExpiryMs(token);
  if (jwtExpiry) return jwtExpiry;

  const minutes = Number(expiryMinutes);
  if (Number.isFinite(minutes) && minutes > 0) {
    return now + minutes * 60 * 1000;
  }

  return null;
}

export function isSessionExpired(expiresAt, now = Date.now()) {
  if (expiresAt == null) return true;
  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry)) return true;
  return now >= expiry;
}

export function stripSensitiveAuthFields(data) {
  if (!data || typeof data !== "object") return {};
  const session = { ...data };
  delete session.password;
  delete session.Password;
  delete session.token;
  return session;
}
