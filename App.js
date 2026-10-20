import { StatusBar } from "expo-status-bar";
import StackNavigator from "./navigators/StackNavigator";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GlobalProvider } from "./context/GlobalContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import useInAppUpdates from "./utils/useInAppUpdates";
import useEASUpdates from "./utils/useEASUpdates";
import IOSUpdatePopup from "./components/IOSUpdatePopup";

// ✅ Create QueryClient outside component
const queryClient = new QueryClient();

export default function App() {
  // Store binary updates (Play Store / App Store)
  useInAppUpdates();
  // OTA JS/asset updates to all devices (EAS Update)
  useEASUpdates();

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <GlobalProvider>
          <StackNavigator />
          <IOSUpdatePopup />
          <StatusBar style="auto" />
        </GlobalProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
