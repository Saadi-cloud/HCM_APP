import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const preferenceKey = (employeeId) => `hcm.biometric.${employeeId}`;

export async function getBiometricSupport() {
  try {
    const [hasHardware, isEnrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    return {
      available: hasHardware && isEnrolled,
      label: biometricLabel(types),
    };
  } catch {
    return { available: false, label: "Biometrics" };
  }
}

function biometricLabel(types = []) {
  const { FACIAL_RECOGNITION, FINGERPRINT } = LocalAuthentication.AuthenticationType;
  if (types.includes(FACIAL_RECOGNITION) && types.includes(FINGERPRINT)) {
    return "Fingerprint / Face ID";
  }
  if (types.includes(FACIAL_RECOGNITION)) return "Face ID";
  if (types.includes(FINGERPRINT)) return "Fingerprint";
  return "Biometrics";
}

export async function authenticateWithBiometrics(promptMessage = "Unlock DWP HCM") {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });
    return { success: !!result.success, error: result.success ? null : result.error };
  } catch {
    return { success: false, error: "unknown" };
  }
}

export async function readBiometricPreference(employeeId) {
  if (!(Number(employeeId) > 0)) return null;
  try {
    const value = await SecureStore.getItemAsync(preferenceKey(employeeId));
    if (value === "enabled") return true;
    if (value === "disabled") return false;
    return null;
  } catch {
    return null;
  }
}

export async function saveBiometricPreference(employeeId, enabled) {
  if (!(Number(employeeId) > 0)) return;
  await SecureStore.setItemAsync(preferenceKey(employeeId), enabled ? "enabled" : "disabled");
}
