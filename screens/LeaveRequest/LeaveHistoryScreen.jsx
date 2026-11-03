import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import LeaveHistoryCard from "../../components/LeaveHistoryCard";
import { useGlobalState } from "../../context/GlobalContext";
import { fetchEmployeeLeaveHistory, getLeaveErrorMessage } from "../../services/leaveService";
import { businessDateKey } from "../../utils/dateTime";
import { theme } from "../../constants/theme";

const STATUS_FILTERS = [
  { label: "All", value: null },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Withdrawn", value: "WITHDRAWN" },
  { label: "Cancelled", value: "CANCELLED" },
];

const LeaveHistoryScreen = ({ navigation }) => {
  const { employeeId, accessToken } = useGlobalState();
  const currentYear = Number(businessDateKey().slice(0, 4));
  const [leaveYear, setLeaveYear] = useState(currentYear);
  const [status, setStatus] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const query = useQuery({
    queryKey: ["employeeLeaveHistory", employeeId, leaveYear, status],
    queryFn: () => fetchEmployeeLeaveHistory(employeeId, { leaveYear, status }),
    enabled: !!accessToken && Number(employeeId) > 0,
  });

  const years = useMemo(() => [currentYear, currentYear - 1, currentYear - 2], [currentYear]);
  const items = query.data ?? [];

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MY LEAVE</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.filters}>
        <Text style={styles.filterLabel}>Year</Text>
        <View style={styles.chipRow}>
          {years.map((year) => (
            <TouchableOpacity
              key={year}
              style={[styles.chip, leaveYear === year && styles.chipSelected]}
              onPress={() => setLeaveYear(year)}
            >
              <Text style={[styles.chipText, leaveYear === year && styles.chipTextSelected]}>{year}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.filterLabel}>Status</Text>
        <View style={styles.chipRow}>
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.label}
              style={[styles.chip, status === filter.value && styles.chipSelected]}
              onPress={() => setStatus(filter.value)}
            >
              <Text style={[styles.chipText, status === filter.value && styles.chipTextSelected]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.leaveRequestId)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} />}
        ListEmptyComponent={
          query.isLoading ? (
            <ActivityIndicator color={theme.navy} style={styles.empty} />
          ) : query.isError ? (
            <View style={styles.empty}>
              <Text style={styles.errorText}>{getLeaveErrorMessage(query.error)}</Text>
              <TouchableOpacity onPress={() => query.refetch()}>
                <Text style={styles.retry}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="calendar-clear-outline" size={40} color={theme.muted} />
              <Text style={styles.emptyText}>No leave requests for this filter.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <LeaveHistoryCard
            item={item}
            expanded={expandedId === item.leaveRequestId}
            onPress={() =>
              setExpandedId((current) => (current === item.leaveRequestId ? null : item.leaveRequestId))
            }
          />
        )}
      />
    </SafeAreaView>
  );
};

export default LeaveHistoryScreen;

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
  filters: {
    backgroundColor: theme.background,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 6,
  },
  filterLabel: { fontSize: 12, fontWeight: "700", color: theme.muted },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  chip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipSelected: { backgroundColor: theme.navy, borderColor: theme.navy },
  chipText: { color: theme.text, fontWeight: "600", fontSize: 13 },
  chipTextSelected: { color: theme.white },
  list: { flexGrow: 1, backgroundColor: theme.background, padding: 16, gap: 12 },
  empty: { alignItems: "center", gap: 10, paddingVertical: 40 },
  emptyText: { color: theme.muted, textAlign: "center" },
  errorText: { color: theme.danger, textAlign: "center" },
  retry: { color: theme.navy, fontWeight: "700" },
});
