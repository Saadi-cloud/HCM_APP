import React from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../constants/theme";

const SplashScreen = () => (
  <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
    <View style={styles.mediaWrap}>
      <Image source={require("../assets/icon.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.brand}>
        <Text style={styles.brandAccent}>DWP</Text> HCM
      </Text>
      <ActivityIndicator color={theme.white} style={styles.spinner} />
    </View>
  </SafeAreaView>
);

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.navy,
  },
  mediaWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 140,
    height: 140,
    borderRadius: 28,
  },
  brand: {
    marginTop: 20,
    color: theme.white,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 1,
  },
  brandAccent: {
    color: theme.yellow,
  },
  spinner: {
    marginTop: 24,
  },
});
