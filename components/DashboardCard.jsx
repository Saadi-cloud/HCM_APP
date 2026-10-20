import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "../constants/theme";

const DashboardCard = ({ title, icon, onPress, width, placeholder }) => (
  <TouchableOpacity
    style={[styles.card, { width }]}
    onPress={onPress}
    activeOpacity={0.75}
    accessibilityRole="button"
    accessibilityLabel={title}
  >
    <View style={styles.iconWrap}>
      <Ionicons name={icon} size={34} color={theme.navy} />
    </View>
    <Text style={styles.title} numberOfLines={2}>
      {title}
    </Text>
    {placeholder ? <View style={styles.dot} /> : null}
  </TouchableOpacity>
);

export default DashboardCard;

const styles = StyleSheet.create({
  card: {
    aspectRatio: 0.95,
    backgroundColor: theme.white,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: "#0B1F44",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconWrap: {
    marginBottom: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.navy,
    textAlign: "center",
  },
  dot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.border,
  },
});
