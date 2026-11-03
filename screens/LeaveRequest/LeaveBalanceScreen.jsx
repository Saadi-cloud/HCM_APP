import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { useGlobalState } from "../../context/GlobalContext";
import { fetchEmployeeLeaveBalance, getLeaveErrorMessage } from "../../services/leaveService";
import { businessDateKey } from "../../utils/dateTime";
import { theme } from "../../constants/theme";

const LeaveBalanceScreen = ({ navigation }) => {
  const { employeeId, accessToken } = useGlobalState();
  const leaveYear = Number(businessDateKey().slice(0, 4));

  const query = useQuery({
    queryKey: ["employeeLeaveBalance", employeeId, leaveYear],
    queryFn: () => fetchEmployeeLeaveBalance(employeeId, leaveYear),
    enabled: !!accessToken && Number(employeeId) > 0,
  });

  const rows = query.data ?? [];

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MY BALANCE</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.leaveTypeId)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} />}
        ListHeaderComponent={<Text style={styles.year}>Leave year {leaveYear}</Text>}
        ListEmptyComponent={
          query.isLoading ? (
            <ActivityIndicator color={theme.navy} style={styles.empty} />
          ) : query.isError ? (
            <View style={styles.empty}>
              <Text style={styles.errorText}>{getLeaveErrorMessage(query.error)}</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No leave balance found.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.type}>{item.leaveTypeName || item.leaveTypeCode}</Text>
            <View style={styles.row}>
              <Stat label="Allocated" value={item.allocatedDays} />
              <Stat label="Used" value={item.usedDays} />
              <Stat label="Pending" value={item.pendingDays} />
              <Stat label="Balance" value={item.balanceDays} highlight />
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

function Stat({ label, value, highlight }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.balance]}>{value ?? "—"}</Text>
    </View>
  );
}

export default LeaveBalanceScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.navy },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { color: theme.white, fontSize: 18, fontWeight: "800", letterSpacing: 1.5 },
  headerSpacer: { width: 26 },
  list: { flexGrow: 1, backgroundColor: theme.background, padding: 16, gap: 12 },
  year: { color: theme.muted, fontWeight: "600", marginBottom: 4 },
  card: {
    backgroundColor: theme.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 12,
  },
  type: { fontSize: 16, fontWeight: "800", color: theme.navy },
  row: { flexDirection: "row" },
  stat: { flex: 1, alignItems: "center" },
  statLabel: { fontSize: 11, color: theme.muted },
  statValue: { fontSize: 16, fontWeight: "800", color: theme.text, marginTop: 2 },
  balance: { color: "#15803D" },
  empty: { alignItems: "center", gap: 10, paddingVertical: 40 },
  emptyText: { color: theme.muted },
  errorText: { color: theme.danger, textAlign: "center" },
});
