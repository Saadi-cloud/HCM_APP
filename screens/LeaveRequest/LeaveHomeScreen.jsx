import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "../../constants/theme";

const CARDS = [
  {
    key: "apply",
    eyebrow: "Apply",
    title: "Leave",
    icon: "exit-outline",
    color: theme.navy,
    route: "ApplyLeave",
  },
  {
    key: "cancel",
    eyebrow: "Cancel",
    title: "Leave",
    icon: "close-circle",
    color: theme.yellow,
    route: "CancelLeave",
    note: "Cancel / withdraw leave will be connected next.",
  },
  {
    key: "calendar",
    eyebrow: "Leave",
    title: "Calendar",
    icon: "calendar-outline",
    color: theme.orange,
    route: "LeaveCalendar",
    note: "Leave calendar will be connected next.",
  },
  {
    key: "summary",
    eyebrow: "Leave",
    title: "Summary",
    icon: "stats-chart-outline",
    color: "#15803D",
    route: "LeaveSummary",
    note: "Leave summary will be connected next.",
  },
];

const LeaveHomeScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - 16 * 2 - 14) / 2);

  const openCard = (card) => {
    if (card.route === "ApplyLeave") {
      navigation.navigate("ApplyLeave");
      return;
    }
    navigation.navigate("ModulePlaceholder", {
      title: `${card.eyebrow} ${card.title}`.trim(),
      icon: card.icon,
      note: card.note,
    });
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

      <View style={styles.grid}>
        {CARDS.map((card) => (
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
        ))}
      </View>
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
