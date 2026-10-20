import axios from "axios";
import { API_BASE_URL, API_TIMEOUT_MS } from "../constants/config";

let authToken = null;
let unauthorizedHandler = null;

export function setAuthToken(token) {
  authToken = token || null;
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
});

api.interceptors.request.use((config) => {
  const url = String(config.url ?? "");
  const isLogin = url === "/Auth" || url.endsWith("/Auth");
  if (authToken && !isLogin) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = String(error?.config?.url ?? "");
    const isLogin = url === "/Auth" || url.endsWith("/Auth");
    if (error?.response?.status === 401 && !isLogin && unauthorizedHandler) {
      unauthorizedHandler();
    }
    return Promise.reject(error);
  }
);
