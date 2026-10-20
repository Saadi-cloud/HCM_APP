import { useEffect, useState } from "react";
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import { useGlobalState } from "../context/GlobalContext";
import { getBiometricSupport } from "../utils/biometrics";
import { theme } from "../constants/theme";

const SettingsScreen = ({ navigation }) => {
  const { authData, biometricEnabled, setBiometricPreference, logout } = useGlobalState();
  const [support, setSupport] = useState({ available: false, label: "Biometrics" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getBiometricSupport().then(setSupport);
  }, []);

  const toggleBiometrics = async (enabled) => {
    setBusy(true);
    const saved = await setBiometricPreference(enabled);
    setBusy(false);
    if (!saved) {
      Alert.alert("Not enabled", `${support.label} confirmation was not completed.`);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="finger-print-outline" size={24} color={theme.navy} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{support.label} Login</Text>
              <Text style={styles.rowNote}>
                {support.available
                  ? "Require device authentication when the app opens."
                  : "No enrolled biometrics or passcode were found on this device."}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={toggleBiometrics}
              disabled={busy || (!support.available && !biometricEnabled)}
              trackColor={{ true: theme.navy }}
            />
          </View>
          <Text style={styles.footnote}>
            Biometric unlock only reopens a valid session on this device. When the session expires you must sign in
            with your password.
          </Text>
        </View>

        <View style={styles.card}>
          <InfoRow label="User" value={authData?.username} />
          <InfoRow label="Employee ID" value={authData?.employeeId} />
          <InfoRow label="Company" value={authData?.companyName} />
          <InfoRow label="App version" value={Constants.expoConfig?.version} />
        </View>

        <TouchableOpacity style={styles.signOut} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color={theme.white} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

function InfoRow({ label, value }) {
  const text = value == null || String(value).trim() === "" ? "—" : String(value);
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{text}</Text>
    </View>
  );
}

export default SettingsScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    backgroundColor: theme.navy,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: theme.white,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 1,
  },
  headerSpacer: {
    width: 26,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: theme.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.text,
  },
  rowNote: {
    fontSize: 13,
    color: theme.muted,
    marginTop: 2,
  },
  footnote: {
    fontSize: 12,
    color: theme.muted,
    marginTop: 12,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    gap: 12,
  },
  infoLabel: {
    color: theme.muted,
    fontSize: 14,
  },
  infoValue: {
    color: theme.text,
    fontSize: 14,
    flexShrink: 1,
    textAlign: "right",
  },
  signOut: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.orange,
    borderRadius: 40,
    paddingVertical: 14,
  },
  signOutText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
