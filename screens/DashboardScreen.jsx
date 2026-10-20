import { useEffect, useRef } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useGlobalState } from "../context/GlobalContext";
import { useEmployeeProfileQuery, useEmployeeShiftListQuery } from "../apis/Get";
import DashboardCard from "../components/DashboardCard";
import { getBiometricSupport } from "../utils/biometrics";
import { theme } from "../constants/theme";

const GRID_PADDING = 16;
const GRID_GAP = 12;
const COLUMNS = 3;

const MODULES = [
  { key: "todo", title: "Things to do", icon: "checkbox-outline" },
  { key: "requests", title: "Request Status", icon: "document-text-outline" },
  { key: "leave", title: "Leave", icon: "airplane-outline" },
  { key: "hr", title: "Reach HR", icon: "chatbubbles-outline" },
  { key: "time", title: "Time", icon: "time-outline", route: "Time" },
  { key: "notice", title: "Notice Board", icon: "megaphone-outline" },
  { key: "activity", title: "Activity Feed", icon: "pulse-outline" },
  { key: "attendance", title: "Attendance", icon: "calendar-outline", route: "AttendanceHistory" },
];

const DashboardScreen = ({ navigation }) => {
  const { authData, logout, biometricPreferenceKnown, setBiometricPreference } = useGlobalState();
  const { width } = useWindowDimensions();
  const profileQuery = useEmployeeProfileQuery();
  const shiftQuery = useEmployeeShiftListQuery();
  const offered = useRef(false);

  const profile = profileQuery.data;
  const name = displayName(profile) || authData?.username || "Employee";
  const designation = profile?.designation?.designationName || profile?.desiG_NAME;
  const cardWidth = Math.floor((width - GRID_PADDING * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS);

  useEffect(() => {
    if (biometricPreferenceKnown || offered.current) return;
    offered.current = true;
    getBiometricSupport().then((support) => {
      if (!support.available) return;
      Alert.alert(
        `Enable ${support.label} Login`,
        `Use ${support.label} to unlock DWP HCM next time instead of entering your password.`,
        [
          { text: "Not now", style: "cancel", onPress: () => setBiometricPreference(false) },
          { text: "Enable", onPress: () => setBiometricPreference(true) },
        ]
      );
    });
  }, [biometricPreferenceKnown, setBiometricPreference]);

  const openModule = (module) => {
    if (module.route) {
      navigation.navigate(module.route);
      return;
    }
    navigation.navigate("ModulePlaceholder", {
      title: module.title,
      icon: module.icon,
      note: module.note,
    });
  };

  const confirmSignOut = () => {
    Alert.alert("Sign Out", "Do you want to sign out of DWP HCM?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  const refresh = () => {
    profileQuery.refetch();
    shiftQuery.refetch();
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.brand}>
          <Text style={styles.brandAccent}>DWP</Text> HCM
        </Text>
        <Text style={styles.company} numberOfLines={1}>
          {profile?.company?.companyName || authData?.companyName || "Digital World Pakistan"}
        </Text>
      </View>

      <View style={styles.switcher}>
        <TouchableOpacity style={styles.switchItem} onPress={() => navigation.navigate("Profile")}>
          <Ionicons name="person-outline" size={20} color={theme.navy} />
          <Text style={styles.switchText}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.centerCircle}
          onPress={() => navigation.navigate("Profile")}
          accessibilityLabel="Open profile"
        >
          <Text style={styles.centerInitials}>{initials(name)}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.switchItem}
          onPress={() =>
            navigation.navigate("ModulePlaceholder", {
              title: "Timeline",
              icon: "git-commit-outline",
            })
          }
        >
          <Text style={styles.switchText}>Timeline</Text>
          <Ionicons name="git-commit-outline" size={20} color={theme.navy} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={profileQuery.isRefetching} onRefresh={refresh} />}
      >
        <Text style={styles.greeting}>Welcome, {name}</Text>
        {designation ? <Text style={styles.designation}>{designation}</Text> : null}
        {profileQuery.isError ? (
          <Text style={styles.error}>Profile could not be loaded. Pull down to retry.</Text>
        ) : null}

        <View style={styles.grid}>
          {MODULES.map((module) => (
            <DashboardCard
              key={module.key}
              title={module.title}
              icon={module.icon}
              width={cardWidth}
              placeholder={!module.route}
              onPress={() => openModule(module)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerItem} onPress={confirmSignOut}>
          <Ionicons name="log-out-outline" size={22} color={theme.orange} />
          <Text style={[styles.footerText, { color: theme.orange }]}>Sign Out</Text>
        </TouchableOpacity>
        <View style={styles.footerDivider} />
        <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate("Settings")}>
          <Ionicons name="settings-outline" size={22} color={theme.navy} />
          <Text style={styles.footerText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

function displayName(employee) {
  const fullName = String(employee?.fullName ?? "").trim();
  if (fullName) return fullName;
  return [employee?.employeeFirstName, employee?.employeeMiddleName, employee?.employeeLastName]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

function initials(name) {
  const letters = String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return letters || "DW";
}

export default DashboardScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    backgroundColor: theme.navy,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
    alignItems: "center",
  },
  brand: {
    color: theme.white,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 1,
  },
  brandAccent: {
    color: theme.yellow,
  },
  company: {
    color: "#C9D6EE",
    fontSize: 13,
    marginTop: 4,
  },
  switcher: {
    marginHorizontal: 16,
    marginTop: -26,
    backgroundColor: theme.white,
    borderRadius: 30,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    shadowColor: "#0B1F44",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  switchItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  switchText: {
    color: theme.navy,
    fontSize: 15,
    fontWeight: "700",
  },
  centerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.orange,
    borderWidth: 4,
    borderColor: theme.white,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -6,
  },
  centerInitials: {
    color: theme.white,
    fontSize: 20,
    fontWeight: "800",
  },
  scroll: {
    padding: GRID_PADDING,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.navy,
    marginTop: 4,
  },
  designation: {
    fontSize: 13,
    color: theme.muted,
    marginTop: 2,
  },
  error: {
    color: theme.danger,
    marginTop: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    marginTop: 16,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.white,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingVertical: 10,
  },
  footerItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 6,
  },
  footerText: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.navy,
  },
  footerDivider: {
    width: 1,
    height: 26,
    backgroundColor: theme.border,
  },
});
