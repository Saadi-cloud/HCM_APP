import React, { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import SplashScreen from "../screens/SplashScreen";
import LoginScreen from "../screens/LoginScreen";
import BiometricUnlockScreen from "../screens/BiometricUnlockScreen";
import DashboardScreen from "../screens/DashboardScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SettingsScreen from "../screens/SettingsScreen";
import TimeScreen from "../screens/TimeScreen";
import AttendanceHistoryScreen from "../screens/AttendanceHistoryScreen";
import AttendanceDetailsScreen from "../screens/AttendanceDetailsScreen";
import ModulePlaceholderScreen from "../screens/ModulePlaceholderScreen";
import { useGlobalState } from "../context/GlobalContext";

const RootStack = createNativeStackNavigator();
const MIN_SPLASH_MS = 1200;

const StackNavigator = () => {
  const { sessionReady, isAuthenticated, isLocked } = useGlobalState();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!sessionReady || !splashDone ? (
          <RootStack.Screen name="SplashScreen" component={SplashScreen} />
        ) : !isAuthenticated ? (
          <RootStack.Screen
            name="LoginScreen"
            component={LoginScreen}
            options={{ animationTypeForReplace: "pop" }}
          />
        ) : isLocked ? (
          <RootStack.Screen name="BiometricUnlock" component={BiometricUnlockScreen} />
        ) : (
          <RootStack.Group>
            <RootStack.Screen name="Dashboard" component={DashboardScreen} />
            <RootStack.Screen name="Profile" component={ProfileScreen} />
            <RootStack.Screen name="Settings" component={SettingsScreen} />
            <RootStack.Screen name="Time" component={TimeScreen} />
            <RootStack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} />
            <RootStack.Screen name="AttendanceDetails" component={AttendanceDetailsScreen} />
            <RootStack.Screen name="ModulePlaceholder" component={ModulePlaceholderScreen} />
          </RootStack.Group>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default StackNavigator;
