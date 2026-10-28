import { createContext, useCallback, useState, useContext, useEffect, useMemo, useRef } from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { isSessionExpired } from "../utils/session";
import { setAuthToken, setUnauthorizedHandler } from "../utils/Api";
import { clearProfileCache } from "../utils/profileCache";
import {
  authenticateWithBiometrics,
  readBiometricPreference,
  saveBiometricPreference,
} from "../utils/biometrics";

const RELOCK_AFTER_MS = 60 * 1000;
const MAX_TIMER_MS = 2147483647;

const GlobalContext = createContext();

const SESSION_KEY = "hcm.session";
const TOKEN_KEY = "hcm.token";
const LEGACY_AUTH_KEY = "authData";
const CHUNK_SIZE = 1800;

async function deleteSecureKey(key) {
  try {
    const parts = await SecureStore.getItemAsync(`${key}.parts`);
    if (parts) {
      const count = Number(parts);
      for (let index = 0; index < count; index += 1) {
        await SecureStore.deleteItemAsync(`${key}.${index}`);
      }
      await SecureStore.deleteItemAsync(`${key}.parts`);
    }
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Missing keys are expected on a fresh install.
  }
}

async function saveSecureValue(key, value) {
  await deleteSecureKey(key);
  if (value.length <= CHUNK_SIZE) {
    await SecureStore.setItemAsync(key, value);
    return;
  }

  const partCount = Math.ceil(value.length / CHUNK_SIZE);
  await SecureStore.setItemAsync(`${key}.parts`, String(partCount));
  for (let index = 0; index < partCount; index += 1) {
    const part = value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE);
    await SecureStore.setItemAsync(`${key}.${index}`, part);
  }
}

async function readSecureValue(key) {
  const parts = await SecureStore.getItemAsync(`${key}.parts`);
  if (parts) {
    const count = Number(parts);
    let value = "";
    for (let index = 0; index < count; index += 1) {
      const part = await SecureStore.getItemAsync(`${key}.${index}`);
      if (part == null) return null;
      value += part;
    }
    return value;
  }
  return SecureStore.getItemAsync(key);
}

export const GlobalProvider = ({ children }) => {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dealerCode, setDealerCode] = useState(null);
  const [selectedProductType, setSelectedProductType] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState("0");
  const [selectedBranch, setSelectedBranch] = useState();
  const [selectedYear, setSelectedYear] = useState(0);
  const [orderDetails, setOrderDetails] = useState([
    {
      id: "1",
      productType: 0,
      detailTitle: 0,
      qtyOrdered: "",
      productTypeError: "",
      detailTitleError: "",
      qtyOrderedError: "",
      productOpen: false,
      detailOpen: false,
      mainCodePk: null,
      controlCodePk: null,
    },
  ]);

  const [authData, setAuthData] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricPreferenceKnown, setBiometricPreferenceKnown] = useState(true);
  const [clock, setClock] = useState(Date.now());
  const queryClient = useQueryClient();
  const employeeIdRef = useRef(null);
  const backgroundedAt = useRef(null);

  const userId = authData?.userId ?? null;
  const employeeId = authData?.employeeId ?? null;
  const companyId = authData?.companyId ?? null;
  const financialYearId = authData?.financialYearId ?? null;
  const empId = employeeId;
  const userName = authData?.username ?? authData?.userName ?? null;
  const branchId = authData?.branchId ?? null;
  const groupId = authData?.groupId ?? null;
  const objectIds = authData?.objectIds ?? [];
  const isAuthenticated =
    !!authData && !!accessToken && !isSessionExpired(authData.expiresAt, clock);
  employeeIdRef.current = employeeId;

  useEffect(() => {
    const loadAuthData = async () => {
      try {
        await deleteSecureKey(LEGACY_AUTH_KEY);
        const storedSession = await readSecureValue(SESSION_KEY);
        const storedToken = await readSecureValue(TOKEN_KEY);

        if (!storedSession || !storedToken) {
          setAuthData(null);
          setAccessToken(null);
          return;
        }

        const session = JSON.parse(storedSession);
        if (isSessionExpired(session?.expiresAt) || session?.password || session?.token) {
          await deleteSecureKey(SESSION_KEY);
          await deleteSecureKey(TOKEN_KEY);
          setAuthData(null);
          setAccessToken(null);
          return;
        }

        const preference = await readBiometricPreference(session.employeeId);
        setBiometricEnabled(preference === true);
        setBiometricPreferenceKnown(preference !== null);
        setIsLocked(preference === true);
        setAuthData(session);
        setAccessToken(storedToken);
        setAuthToken(storedToken);
      } catch (error) {
        console.error("Failed to load auth session:", error?.message ?? "unknown error");
        setAuthData(null);
        setAccessToken(null);
      } finally {
        setSessionReady(true);
      }
    };

    loadAuthData();
  }, []);

  const login = async ({ session, token }) => {
    if (!session || !token || session.password || session.token) {
      throw new Error("Refusing to store an invalid session.");
    }

    await saveSecureValue(SESSION_KEY, JSON.stringify(session));
    await saveSecureValue(TOKEN_KEY, token);

    const preference = await readBiometricPreference(session.employeeId);
    setBiometricEnabled(preference === true);
    setBiometricPreferenceKnown(preference !== null);
    setIsLocked(false);
    setClock(Date.now());
    setAuthToken(token);
    setAccessToken(token);
    setAuthData(session);
  };

  const logout = useCallback(async () => {
    const currentEmployeeId = employeeIdRef.current;
    queryClient.clear();
    setAuthToken(null);
    setAuthData(null);
    setAccessToken(null);
    setIsLocked(false);
    setBiometricEnabled(false);
    setBiometricPreferenceKnown(true);
    await clearProfileCache(currentEmployeeId);
    await deleteSecureKey(SESSION_KEY);
    await deleteSecureKey(TOKEN_KEY);
    await deleteSecureKey(LEGACY_AUTH_KEY);
  }, [queryClient]);

  const unlock = useCallback(async () => {
    const result = await authenticateWithBiometrics();
    if (result.success) setIsLocked(false);
    return result;
  }, []);

  const setBiometricPreference = useCallback(async (enabled) => {
    const currentEmployeeId = employeeIdRef.current;
    if (enabled) {
      const result = await authenticateWithBiometrics("Confirm to enable biometric login");
      if (!result.success) return false;
    }
    await saveBiometricPreference(currentEmployeeId, enabled);
    setBiometricEnabled(enabled);
    setBiometricPreferenceKnown(true);
    return true;
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
  }, [logout]);

  useEffect(() => {
    if (!authData?.expiresAt) return undefined;
    const delay = Math.min(Math.max(0, Number(authData.expiresAt) - Date.now()), MAX_TIMER_MS);
    const timer = setTimeout(() => setClock(Date.now()), delay + 500);
    return () => clearTimeout(timer);
  }, [authData?.expiresAt, clock]);

  useEffect(() => {
    if (sessionReady && authData && isSessionExpired(authData.expiresAt, clock)) {
      logout();
    }
  }, [authData, clock, logout, sessionReady]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        backgroundedAt.current = Date.now();
        return;
      }
      if (state !== "active") return;

      setClock(Date.now());
      const leftAt = backgroundedAt.current;
      backgroundedAt.current = null;
      if (biometricEnabled && leftAt && Date.now() - leftAt >= RELOCK_AFTER_MS) {
        setIsLocked(true);
      }
    });
    return () => subscription.remove();
  }, [biometricEnabled]);

  const handleOutsidePress = () => {
    if (dropdownVisible) {
      setDropdownVisible(false);
    }
  };

  const value = useMemo(
    () => ({
      selectedProductType,
      setSelectedProductType,
      selectedCompany,
      setSelectedCompany,
      selectedBranch,
      setSelectedBranch,
      selectedYear,
      setSelectedYear,
      dropdownVisible,
      setDropdownVisible,
      dealerCode,
      setDealerCode,
      orderDetails,
      setOrderDetails,
      authData,
      accessToken,
      login,
      logout,
      isAuthenticated,
      sessionReady,
      isLocked,
      unlock,
      biometricEnabled,
      biometricPreferenceKnown,
      setBiometricPreference,
      userId,
      employeeId,
      empId,
      companyId,
      financialYearId,
      userName,
      branchId,
      groupId,
      objectIds,
      handleOutsidePress,
    }),
    [
      selectedProductType,
      selectedCompany,
      selectedBranch,
      selectedYear,
      dropdownVisible,
      dealerCode,
      orderDetails,
      authData,
      accessToken,
      isAuthenticated,
      sessionReady,
      isLocked,
      unlock,
      biometricEnabled,
      biometricPreferenceKnown,
      setBiometricPreference,
      logout,
      userId,
      employeeId,
      empId,
      companyId,
      financialYearId,
      userName,
      branchId,
      groupId,
      objectIds,
    ]
  );

  return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>;
};

export const useGlobalState = () => useContext(GlobalContext);
