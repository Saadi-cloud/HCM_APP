import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useGlobalState } from "../../context/GlobalContext";
import { profileHasScreen } from "../../services/mobileProfileService";
import { theme } from "../../constants/theme";

const SCREEN_CARDS = [
  {
    key: "APPLY_LEAVE",
    eyebrow: "Apply",
    title: "Leave",
    icon: "exit-outline",
    color: theme.navy,
    route: "ApplyLeave",
  },
  {
    key: "MY_LEAVE",
    eyebrow: "My",
    title: "Leave",
    icon: "document-text-outline",
    color: theme.orange,
    route: "LeaveHistory",
  },
  {
    key: "MY_BALANCE",
    eyebrow: "My",
    title: "Balance",
    icon: "stats-chart-outline",
    color: "#15803D",
    route: "LeaveBalance",
  },
  {
    key: "TEAM_LEAVE",
    eyebrow: "Team",
    title: "Leave",
    icon: "people-outline",
    color: theme.navy,
    route: "TeamLeaveHistory",
  },
  {
    key: "ALL_LEAVE",
    eyebrow: "All",
    title: "Leave",
    icon: "business-outline",
    color: theme.navy,
    route: "TeamLeaveHistory",
  },
  {
    key: "LEAVE_APPROVALS",
    eyebrow: "Leave",
    title: "Approvals",
    icon: "checkmark-done-outline",
    color: theme.yellow,
    route: "ModulePlaceholder",
    note: "Leave approvals will be connected when the approval APIs are shared.",
  },
];

const LeaveHomeScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const { mobileProfile, mobileProfileReady } = useGlobalState();
  const cardWidth = Math.floor((width - 16 * 2 - 14) / 2);

  const cards = SCREEN_CARDS.filter((card) => profileHasScreen(mobileProfile, card.key));

  const openCard = (card) => {
    if (card.route === "ModulePlaceholder") {
      navigation.navigate("ModulePlaceholder", {
        title: `${card.eyebrow} ${card.title}`.trim(),
        icon: card.icon,
        note: card.note,
      });
      return;
    }
    navigation.navigate(card.route);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EMPLOYEE LEAVE</Text>
        <View style={styles.headerSpacer} />
      </View>

      {!mobileProfileReady ? (
        <ActivityIndicator color={theme.navy} style={styles.loader} />
      ) : (
        <>
          {mobileProfile?.role || mobileProfile?.leaveHistoryScope ? (
            <Text style={styles.roleLine}>
              {mobileProfile.role}
              {mobileProfile.leaveHistoryScope ? ` · ${mobileProfile.leaveHistoryScope}` : ""}
            </Text>
          ) : null}
          <View style={styles.grid}>
            {(cards.length ? cards : SCREEN_CARDS.filter((card) => card.key === "APPLY_LEAVE" || card.key === "MY_LEAVE")).map(
              (card) => (
                <TouchableOpacity
                  key={card.key}
                  style={[styles.card, { width: cardWidth }]}
                  onPress={() => openCard(card)}
                  activeOpacity={0.85}
                >
                  <Ionicons name={card.icon} size={42} color={card.color} />
                  <Text style={styles.eyebrow}>{card.eyebrow}</Text>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

export default LeaveHomeScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
  },
  headerSpacer: {
    width: 26,
  },
  roleLine: {
    paddingHorizontal: 16,
    paddingTop: 12,
    color: theme.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  loader: {
    marginTop: 40,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    padding: 16,
  },
  card: {
    backgroundColor: theme.white,
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: theme.border,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    minHeight: 150,
  },
  eyebrow: {
    marginTop: 8,
    fontSize: 13,
    color: "#7C93B8",
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.navy,
  },
});
