import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useGlobalState } from "../context/GlobalContext";
import { getBiometricSupport } from "../utils/biometrics";
import { theme } from "../constants/theme";

const BiometricUnlockScreen = () => {
  const { unlock, logout, authData } = useGlobalState();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [label, setLabel] = useState("Biometrics");
  const prompted = useRef(false);

  const attemptUnlock = useCallback(async () => {
    setBusy(true);
    setMessage("");
    const support = await getBiometricSupport();
    setLabel(support.label);
    if (!support.available) {
      setBusy(false);
      setMessage("Biometric unlock is not available on this device. Sign in with your password.");
      return;
    }
    const result = await unlock();
    setBusy(false);
    if (!result.success && result.error !== "user_cancel" && result.error !== "system_cancel") {
      setMessage("Authentication failed. Try again or sign in with your password.");
    }
  }, [unlock]);

  useEffect(() => {
    if (prompted.current) return;
    prompted.current = true;
    attemptUnlock();
  }, [attemptUnlock]);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="finger-print-outline" size={56} color={theme.navy} />
        </View>
        <Text style={styles.title}>DWP HCM is locked</Text>
        <Text style={styles.subtitle}>
          {authData?.username ? `Signed in as ${authData.username}. ` : ""}
          Use {label} to continue.
        </Text>

        {message ? <Text style={styles.error}>{message}</Text> : null}

        <TouchableOpacity style={styles.primary} onPress={attemptUnlock} disabled={busy}>
          {busy ? <ActivityIndicator color={theme.white} /> : null}
          <Text style={styles.primaryText}>Unlock</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={logout} disabled={busy}>
          <Text style={styles.secondaryText}>Sign in with password</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default BiometricUnlockScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.navy,
  },
  content: {
    flex: 1,
    margin: 20,
    borderRadius: 24,
    backgroundColor: theme.white,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: theme.navy,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.navy,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: theme.muted,
    textAlign: "center",
    lineHeight: 22,
  },
  error: {
    color: theme.danger,
    textAlign: "center",
    marginTop: 16,
  },
  primary: {
    marginTop: 28,
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.navy,
    borderRadius: 40,
    paddingVertical: 15,
  },
  primaryText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: "700",
  },
  secondary: {
    marginTop: 14,
    paddingVertical: 10,
  },
  secondaryText: {
    color: theme.orange,
    fontSize: 15,
    fontWeight: "600",
  },
});
