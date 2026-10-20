import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { app_colors } from "../utils/colors";
import { useCompanyListQuery, useFinancialYearListQuery } from "../apis/Get";
import DropDownPicker from "react-native-dropdown-picker";
import { api } from "../utils/Api";
import { useMutation } from "@tanstack/react-query";
import { useGlobalState } from "../context/GlobalContext";
import { buildLoginRequest, getAuthErrorMessage, sanitizeAuthResponse } from "../services/authService";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { LinearGradient } from "expo-linear-gradient";

const LoginScreen = ({ navigation }) => {
  const company_details = useCompanyListQuery();
  const financial_year = useFinancialYearListQuery();

  const [UserName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [oldPasswordVisible, setOldPasswordVisible] = useState(false);

  const {
    selectedYear,
    setSelectedYear,
    selectedCompany,
    setSelectedCompany,
    login,
  } = useGlobalState();

  // Validation state
  const [UserNameError, setUserNameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [companyError, setCompanyError] = useState("");
  const [yearError, setYearError] = useState("");
  const yearSelectionTouched = useRef(false);

  const [companyOpen, setCompanyOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const companyItems = useMemo(
    () =>
      (company_details?.data ?? []).map((company, index) => ({
        label: company?.companyName ?? "Unnamed Company",
        value: String(company?.companyId ?? index),
      })),
    [company_details?.data]
  );

  const yearItems = useMemo(
    () =>
      (financial_year?.data ?? []).map((year) => ({
        label: formatFinancialYearLabel(year),
        value: year.financialYearId,
      })),
    [financial_year?.data]
  );

  const modalPickerProps = useMemo(
    () => ({
      modalProps: {
        animationType: "slide",
        presentationStyle: "fullScreen",
      },
      modalContentContainerStyle: {
        marginTop: Platform.OS === "android" ? 20 : 60,
        backgroundColor: "#fff",
      },
      listMode: "MODAL",
    }),
    []
  );

  useEffect(() => {
    if (yearSelectionTouched.current) return;
    const years = financial_year?.data ?? [];
    const activeYear = years.find(
      (year) => String(year?.financialYearStatus ?? "").toLowerCase() === "yes"
    );
    if (activeYear?.financialYearId != null) {
      setSelectedYear(activeYear.financialYearId);
    }
  }, [financial_year?.data, setSelectedYear]);

  // ✅ Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials) => {
      const response = await api.post("/Auth", credentials);
      return response?.data;
    },
    onSuccess: async (data, variables) => {
      const result = sanitizeAuthResponse(data);
      if (!result.ok) {
        Alert.alert("Login Failed", result.message);
        return;
      }

      await login({
        token: result.token,
        session: {
          ...result.session,
          companyId: result.session.companyId || variables.companyId,
          companyName: result.session.companyName || variables.companyName,
          financialYearId: result.session.financialYearId || variables.financialYearId,
          startingDate: result.session.startingDate || variables.startingDate,
          endingDate: result.session.endingDate || variables.endingDate,
        },
      });
    },
    onError: (error) => {
      Alert.alert("Login Failed", getAuthErrorMessage(error));
    },
  });

  // ✅ Loading & error states for dropdown data
  if (company_details.isLoading || financial_year.isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (company_details.isError || financial_year.isError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "red" }}>
          Error loading data for login. Please try again later.
        </Text>
      </View>
    );
  }

  // ✅ Handle form submission
  const handleSubmit = () => {
    setUserNameError("");
    setPasswordError("");
    setCompanyError("");
    setYearError("");

    if (!selectedCompany || selectedCompany === "0") {
      setCompanyError("Company is required.");
      return;
    }
    if (!selectedYear) {
      setYearError("Financial year is required.");
      return;
    }
    if (!UserName.trim()) {
      setUserNameError("User Name is required.");
      return;
    }
    if (!password.trim()) {
      setPasswordError("Password is required.");
      return;
    }
    const company = (company_details?.data ?? []).find(
      (item) => String(item?.companyId) === String(selectedCompany)
    );
    const year = (financial_year?.data ?? []).find(
      (item) => String(item?.financialYearId) === String(selectedYear)
    );

    try {
      loginMutation.mutate(
        buildLoginRequest({
          username: UserName,
          password,
          company,
          financialYear: year,
        })
      );
    } catch (error) {
      Alert.alert("Login Failed", error?.message || "Please check the login form.");
    }
  };

  return (
    <>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <LinearGradient
          colors={["#04306B", "#0A74D3"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <View style={styles.container}>
            {/* Logo */}
            <View style={{ zIndex: 1, alignItems: "center" }}>
              <Image
                source={require("../assets/img/logooo.png")}
                style={{ width: "100%", height: 60 }}
                resizeMode="contain"
              />
              <Text style={{ fontSize: 20, fontWeight: "bold", paddingTop: 0 }}>
                Sign In to CSS
              </Text>
            </View>

            {/* Scrollable Form */}
            <KeyboardAwareScrollView
              style={{backgroundColor: app_colors.white }}
              contentContainerStyle={styles.scrollheight}
              enableOnAndroid={true}
              extraScrollHeight={Platform.OS === "android" ? 120 : 0}
              keyboardShouldPersistTaps="handled"
            >
              <View>
                {/* Company — modal list avoids inline iOS wheel pickers */}
                <Text style={[styles.txt, styles.label]}>Select Company</Text>
                <DropDownPicker
                  open={companyOpen}
                  value={selectedCompany}
                  items={[{ label: "Select Company", value: "0" }, ...companyItems]}
                  setOpen={(open) => {
                    setCompanyOpen(open);
                    if (open) {
                      setYearOpen(false);
                    }
                  }}
                  setValue={setSelectedCompany}
                  onChangeValue={(value) => {
                    if (value && value !== "0") setCompanyError("");
                  }}
                  placeholder="Select Company"
                  style={[styles.dropdownLogin, { zIndex: 3000 }]}
                  dropDownContainerStyle={styles.dropdownLoginContainer}
                  {...modalPickerProps}
                />
                {companyError ? <Text style={styles.errorText}>{companyError}</Text> : null}

                <Text style={[styles.txt, styles.label]}>Select Year</Text>
                <DropDownPicker
                  open={yearOpen}
                  value={selectedYear}
                  items={[{ label: "Financial Year", value: 0 }, ...yearItems]}
                  setOpen={(open) => {
                    setYearOpen(open);
                    if (open) {
                      setCompanyOpen(false);
                    }
                  }}
                  setValue={(callback) => {
                    yearSelectionTouched.current = true;
                    setSelectedYear(callback);
                  }}
                  onChangeValue={(value) => {
                    if (value) setYearError("");
                  }}
                  placeholder="Financial Year"
                  style={[styles.dropdownLogin, { zIndex: 2000 }]}
                  dropDownContainerStyle={styles.dropdownLoginContainer}
                  {...modalPickerProps}
                />
                {yearError ? <Text style={styles.errorText}>{yearError}</Text> : null}

                {/* Username */}
                <Text style={[styles.txt, styles.label]}>UserName</Text>
                <TextInput
                  onChangeText={(val) => {
                    setUserName(val);
                    if (val) setUserNameError("");
                  }}
                  value={UserName}
                  placeholder="UserName"
                  style={styles.input}
                  placeholderTextColor="#9CA3AF"
                />
                {UserNameError ? <Text style={styles.errorText}>{UserNameError}</Text> : null}

                {/* Password */}
                <Text style={[styles.txt, styles.label]}>Password</Text>
                <View style={{ position: "relative" }}>
                  <TextInput
                    onChangeText={(val) => {
                      setPassword(val);
                      if (val) setPasswordError("");
                    }}
                    value={password}
                    placeholder="Password"
                    style={styles.input}
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!oldPasswordVisible}
                  />
                      {passwordError ? (
                        <Text style={styles.errorText}>{passwordError}</Text>
                      ) : null}
                  <View style={{ position: "relative" }}>
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setOldPasswordVisible(!oldPasswordVisible)}
                  >
                    <MaterialIcons
                      name={oldPasswordVisible ? "visibility" : "visibility-off"}
                      size={24}
                      color={app_colors.mud}
                    />
                  </TouchableOpacity>
                  </View>
                </View>

                {/* Submit */}
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleSubmit}
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending && <ActivityIndicator color="#ffffff" />}
                  <Text style={styles.buttonText}>Login</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAwareScrollView>
          </View>
        </LinearGradient>
      </TouchableWithoutFeedback>
    </SafeAreaView>
    </>
  );
};

export default LoginScreen;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatFinancialYearPart(value) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})/);
  if (!match) return "—";
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${month} ${match[1]}` : "—";
}

function formatFinancialYearLabel(year) {
  const start = formatFinancialYearPart(year?.startingDate ?? year?.saleYearStartDate);
  const end = formatFinancialYearPart(year?.endingDate ?? year?.saleYearEndDate);
  const active = String(year?.financialYearStatus ?? "").toLowerCase() === "yes" ? " (Active)" : "";
  return `${start} - ${end}${active}`;
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    backgroundColor: app_colors.white,
    borderRadius: 20,
    padding: 20,
    margin: 20,
  },
  scrollheight: {
    padding: 8,
    paddingBottom: 20,
  },
  input: {
    width: "100%",
    height: 48,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    borderRadius: 12,
    // marginVertical: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    paddingVertical: 10,
  },
  button: {
    backgroundColor: app_colors.darkblue,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 40,
    marginTop: 15,
    marginBottom: 15,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  eyeIcon: {
    position: "absolute",
    // top: -90,
    bottom: -10,
    right: 0,
    padding: 22,
  },
  errorText: {
    color: "red",
    fontSize: 12,
    paddingLeft: 5,
  },
  dropdownLogin: {
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 48,
    marginTop: 0,
  },
  dropdownLoginContainer: {
    borderColor: "#E5E7EB",
  },
  txt: {},
});
