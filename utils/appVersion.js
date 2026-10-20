// iOS version check logic — version yahan manually NAHI likhte.
// Update guide: config/IOS_BUILD_CHECKLIST.txt
import * as Application from "expo-application";
import Constants from "expo-constants";
import { api } from "./Api";

export const IOS_APP_STORE_ID = "6760689664";

// Unlisted app — only accessible via direct link (not in App Store search)
export const IOS_APP_STORE_URL =
  "https://apps.apple.com/app/id6760689664";

export const IOS_APP_STORE_ITMS_URL =
  "itms-apps://apps.apple.com/app/id6760689664";

const DEFAULT_VERSION_CHECK_URL =
  "https://cssapp.dwp.com.pk/ios-version.json";

export function getAppConfigVersion() {
  return Constants.expoConfig?.version ?? null;
}

export function getProductionBundleId() {
  return (
    Constants.expoConfig?.ios?.bundleIdentifier ||
    "com.msaadaslam.SecondarySale"
  );
}

function isLikelyExpoRuntimeVersion(nativeVersion, configVersion) {
  if (!nativeVersion || !configVersion) return false;

  const nativeMajor = parseInt(String(nativeVersion).split(".")[0], 10);
  const configMajor = parseInt(String(configVersion).split(".")[0], 10);

  return nativeMajor >= 20 && nativeMajor !== configMajor;
}

export function getInstalledAppVersion() {
  const configVersion = getAppConfigVersion();
  const nativeVersion = Application.nativeApplicationVersion;

  if (
    configVersion &&
    nativeVersion &&
    isLikelyExpoRuntimeVersion(nativeVersion, configVersion)
  ) {
    return configVersion;
  }

  return nativeVersion || configVersion || null;
}

export function isUpdateAvailable(installedVersion, storeVersion) {
  if (!installedVersion || !storeVersion) return false;

  const current = String(installedVersion)
    .trim()
    .split(/[(\s+-]/)[0]
    .split(".")
    .map((part) => parseInt(part, 10) || 0);

  const latest = String(storeVersion)
    .trim()
    .split(/[(\s+-]/)[0]
    .split(".")
    .map((part) => parseInt(part, 10) || 0);

  const length = Math.max(current.length, latest.length);

  for (let i = 0; i < length; i++) {
    const c = current[i] || 0;
    const l = latest[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }

  return false;
}

function normalizeVersionPayload(data) {
  if (!data) return null;

  const iosBlock = data.ios ?? data.iOS ?? data;
  const version =
    iosBlock.latestVersion ??
    iosBlock.version ??
    iosBlock.LatestVersion ??
    data.latestVersion ??
    data.version ??
    data.data?.version ??
    data.data?.latestVersion ??
    null;

  const storeUrl =
    iosBlock.storeUrl ??
    iosBlock.appStoreUrl ??
    data.storeUrl ??
    data.appStoreUrl ??
    data.data?.storeUrl ??
    IOS_APP_STORE_URL;

  if (!version) return null;

  return {
    version: String(version),
    storeUrl,
  };
}

async function fetchVersionFromUrl(url) {
  const cacheBuster = Date.now();
  const separator = url.includes("?") ? "&" : "?";
  const response = await fetch(`${url}${separator}t=${cacheBuster}`, {
    headers: { "Cache-Control": "no-cache" },
  });

  if (!response.ok) return null;

  const data = await response.json();
  return normalizeVersionPayload(data);
}

async function fetchVersionFromBackend() {
  try {
    const response = await api.get("/api/MobileApp/version", {
      params: { platform: "ios" },
      timeout: 15000,
    });
    return normalizeVersionPayload(response.data);
  } catch {
    return null;
  }
}

function getFallbackVersionFromConfig() {
  const extra = Constants.expoConfig?.extra ?? {};
  const version = extra.iosLatestVersion ?? null;

  if (!version) return null;

  return {
    version: String(version),
    storeUrl: extra.iosAppStoreUrl ?? IOS_APP_STORE_URL,
  };
}

/**
 * Unlisted App Store apps are not reliably available via iTunes Lookup on devices.
 * Latest version must come from your own server JSON or backend API.
 */
export async function fetchIOSLatestVersionInfo() {
  const versionCheckUrl =
    Constants.expoConfig?.extra?.iosVersionCheckUrl ??
    DEFAULT_VERSION_CHECK_URL;

  const sources = [
    () => fetchVersionFromBackend(),
    () => fetchVersionFromUrl(versionCheckUrl),
  ];

  for (const getVersion of sources) {
    try {
      const info = await getVersion();
      if (info?.version) return info;
    } catch {
      // try next source
    }
  }

  return getFallbackVersionFromConfig();
}
