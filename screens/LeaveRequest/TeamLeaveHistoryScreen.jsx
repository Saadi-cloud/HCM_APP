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
import { fetchLeaveHistoryForViewer, getLeaveErrorMessage } from "../../services/leaveService";
import { businessDateKey } from "../../utils/dateTime";
import { theme } from "../../constants/theme";

const STATUS_FILTERS = [
  { label: "All", value: null },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Withdrawn", value: "WITHDRAWN" },
];

const PAGE_SIZE = 50;

const TeamLeaveHistoryScreen = ({ navigation }) => {
  const { userId, accessToken, mobileProfile } = useGlobalState();
  const currentYear = Number(businessDateKey().slice(0, 4));
  const [leaveYear, setLeaveYear] = useState(currentYear);
  const [status, setStatus] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  const query = useQuery({
    queryKey: ["leaveHistoryForViewer", userId, leaveYear, status, pageNumber],
    queryFn: () =>
      fetchLeaveHistoryForViewer(userId, {
        leaveYear,
        status,
        pageNumber,
        pageSize: PAGE_SIZE,
      }),
    enabled: !!accessToken && Number(userId) > 0,
  });

  const years = useMemo(() => [currentYear, currentYear - 1, currentYear - 2], [currentYear]);
  const page = query.data;
  const items = page?.items ?? [];
  const title = page?.scope || mobileProfile?.leaveHistoryScope || "TEAM LEAVE";
  const totalPages = Math.max(1, Math.ceil((page?.totalCount || 0) / PAGE_SIZE));

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {String(title).toUpperCase()}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.filters}>
        <Text style={styles.count}>
          {page?.totalCount ?? 0} request{(page?.totalCount ?? 0) === 1 ? "" : "s"}
          {page?.viewerRole ? ` · ${page.viewerRole}` : ""}
        </Text>
        <View style={styles.chipRow}>
          {years.map((year) => (
            <TouchableOpacity
              key={year}
              style={[styles.chip, leaveYear === year && styles.chipSelected]}
              onPress={() => {
                setPageNumber(1);
                setLeaveYear(year);
              }}
            >
              <Text style={[styles.chipText, leaveYear === year && styles.chipTextSelected]}>{year}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.chipRow}>
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.label}
              style={[styles.chip, status === filter.value && styles.chipSelected]}
              onPress={() => {
                setPageNumber(1);
                setStatus(filter.value);
              }}
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
              <Ionicons name="people-outline" size={40} color={theme.muted} />
              <Text style={styles.emptyText}>No team leave requests for this filter.</Text>
            </View>
          )
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={styles.pager}>
              <TouchableOpacity
                style={[styles.pageButton, pageNumber <= 1 && styles.pageDisabled]}
                disabled={pageNumber <= 1}
                onPress={() => setPageNumber((value) => Math.max(1, value - 1))}
              >
                <Text style={styles.pageButtonText}>Previous</Text>
              </TouchableOpacity>
              <Text style={styles.pageLabel}>
                Page {pageNumber} / {totalPages}
              </Text>
              <TouchableOpacity
                style={[styles.pageButton, pageNumber >= totalPages && styles.pageDisabled]}
                disabled={pageNumber >= totalPages}
                onPress={() => setPageNumber((value) => Math.min(totalPages, value + 1))}
              >
                <Text style={styles.pageButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <LeaveHistoryCard
            item={item}
            showEmployee
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

export default TeamLeaveHistoryScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.navy },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    flex: 1,
    color: theme.white,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "center",
    marginHorizontal: 8,
  },
  headerSpacer: { width: 26 },
  filters: {
    backgroundColor: theme.background,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  count: { fontSize: 12, color: theme.muted, fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
  pager: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  pageButton: {
    backgroundColor: theme.navy,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pageDisabled: { opacity: 0.4 },
  pageButtonText: { color: theme.white, fontWeight: "700" },
  pageLabel: { color: theme.muted, fontWeight: "600" },
});
