import axios from "axios";
import { useAuthStore } from "../hooks/useAuthStore";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.message || "";
      const url = error.config?.url || "";

      const isInvitationError =
        url.includes("/invitations/") ||
        errorMessage.includes("invitation") ||
        errorMessage.includes("This invitation");

      const isPublicEndpoint =
        url.includes("/auth/") ||
        url.includes("/invitations/") ||
        url.includes("/users/check-email");

      const isRealAuthError =
        errorMessage.includes("Invalid credentials") ||
        errorMessage.includes("Token expired") ||
        errorMessage.includes("Invalid token") ||
        errorMessage.includes("Authentication failed");

      console.log("401 Error Details:", {
        url,
        message: errorMessage,
        isInvitationError,
        isPublicEndpoint,
        isRealAuthError,
      });

      if (
        !isInvitationError &&
        !isPublicEndpoint &&
        (isRealAuthError || !errorMessage)
      ) {
        console.log("Logging out due to authentication error");
        useAuthStore.getState().clearAuth();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
