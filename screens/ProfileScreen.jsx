import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useAttendanceShiftQuery,
  useEmployeeProfileQuery,
  useEmployeeShiftListQuery,
  usePayrollShiftQuery,
} from "../apis/Get";
import { useGlobalState } from "../context/GlobalContext";
import { readProfileCache, saveProfileCache } from "../utils/profileCache";
import { resolveShiftSchedule, selectApplicableShift } from "../utils/shift";

const ProfileScreen = ({ navigation }) => {
  const { employeeId } = useGlobalState();
  const [cachedProfile, setCachedProfile] = useState(null);
  const profileQuery = useEmployeeProfileQuery();
  const shiftListQuery = useEmployeeShiftListQuery();
  const profile = profileQuery.data ?? cachedProfile;
  const applicableShift = selectApplicableShift(shiftListQuery.data, employeeId);
  const shiftId = Number(applicableShift?.shifT_ID || profile?.shiftId || 0);
  const attendanceShiftQuery = useAttendanceShiftQuery(shiftId);
  const attendanceSchedule = resolveShiftSchedule(attendanceShiftQuery.data);
  const payrollShiftQuery = usePayrollShiftQuery(
    shiftId,
    attendanceShiftQuery.isFetched && !attendanceSchedule
  );
  const schedule = attendanceSchedule || resolveShiftSchedule(payrollShiftQuery.data);

  useEffect(() => {
    let active = true;
    readProfileCache(employeeId)
      .then((cached) => {
        if (active) setCachedProfile(cached);
      })
      .catch(() => {
        if (active) setCachedProfile(null);
      });
    return () => {
      active = false;
    };
  }, [employeeId]);

  useEffect(() => {
    if (!profileQuery.data) return;
    if (Number(profileQuery.data.employeeId) !== Number(employeeId)) return;
    saveProfileCache(employeeId, profileQuery.data).catch(() => {});
  }, [employeeId, profileQuery.data]);

  const refresh = () => {
    profileQuery.refetch();
    shiftListQuery.refetch();
    if (shiftId > 0) attendanceShiftQuery.refetch();
  };

  const name = employeeDisplayName(profile);
  const mismatched =
    profileQuery.data && Number(profileQuery.data.employeeId) !== Number(employeeId);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.backSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={profileQuery.isRefetching} onRefresh={refresh} />
        }
      >
        <View style={styles.avatar}>
          <Text style={styles.initials}>{initials(name)}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>

        {profileQuery.isLoading && !profile ? <ActivityIndicator color="#083785" /> : null}
        {profileQuery.isError ? (
          <Text style={styles.error}>Unable to load the employee profile.</Text>
        ) : null}
        {mismatched ? (
          <Text style={styles.error}>The profile does not match the signed-in employee.</Text>
        ) : null}

        <View style={styles.card}>
          <ProfileRow label="Full Name" value={name} />
          <ProfileRow label="Employee ID" value={profile?.employeeId ?? employeeId} />
          <ProfileRow label="Company" value={profile?.company?.companyName || profile?.companyName} />
          <ProfileRow label="Department" value={profile?.department?.departmentName || profile?.departmentName} />
          <ProfileRow label="Designation" value={profile?.designation?.designationName || profile?.designationName || profile?.desiG_NAME} />
          <ProfileRow label="Email Address" value={profile?.emaiL_ADDRESS || profile?.employeeEmail} />
          <ProfileRow label="Mobile Number" value={profile?.employeeMobile} />
          <ProfileRow label="Permanent Address" value={profile?.employeePermanentAddress} />
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Assigned Shift</Text>
          {shiftListQuery.isLoading ? <ActivityIndicator color="#083785" /> : null}
          {shiftListQuery.isError ? (
            <Text style={styles.error}>Unable to load the employee shift assignment.</Text>
          ) : null}
          <ProfileRow label="Shift Name" value={schedule?.shiftName} />
          <ProfileRow label="Scheduled In" value={schedule?.scheduledInLabel} />
          <ProfileRow label="Scheduled Out" value={schedule?.scheduledOutLabel} />
          <ProfileRow label="Overnight" value={schedule ? (schedule.overnight ? "Yes" : "No") : null} />
          {/* <ProfileRow label="Effective From" value={formatDate(applicableShift?.effectivE_FROM)} /> */}
          {/* <ProfileRow label="Effective To" value={formatDate(applicableShift?.effectivE_TO)} /> */}
          {!shiftListQuery.isLoading && !applicableShift ? (
            <Text style={styles.note}>No current shift assignment was returned for this employee.</Text>
          ) : null}
          {!schedule && !attendanceShiftQuery.isLoading && !payrollShiftQuery.isLoading ? (
            <Text style={styles.note}>
              The shift assignment does not include scheduled check-in and check-out times.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

function employeeDisplayName(employee) {
  const fullName = String(employee?.fullName ?? "").trim();
  if (fullName) return fullName;
  const parts = [employee?.employeeFirstName, employee?.employeeMiddleName, employee?.employeeLastName]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean);
  return parts.join(" ") || "Employee";
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

function formatDate(value) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match || match[1] === "0001") return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function displayValue(value) {
  if (value == null) return "—";
  const text = String(value).trim();
  return text || "—";
}

function ProfileRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{displayValue(value)}</Text>
    </View>
  );
}

export default ProfileScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  header: {
    backgroundColor: "#083785",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: {
    color: "#FFFFFF",
    fontSize: 16,
    width: 60,
  },
  backSpacer: {
    width: 60,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#083785",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
  },
  name: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#083785",
    marginTop: 12,
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  section: {
    fontSize: 16,
    fontWeight: "700",
    color: "#083785",
    marginBottom: 8,
  },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  label: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    color: "#111827",
  },
  error: {
    color: "#B91C1C",
    textAlign: "center",
    marginBottom: 12,
  },
  note: {
    color: "#4B5563",
    marginTop: 12,
    lineHeight: 20,
  },
});
